/**
 * Interpretador do relatorio R3, Vendas por Produto Detalhado, do Altec.
 *
 * O que se sabe do formato NAO vem de documentacao: nao existe uma linha publica sobre o R3.
 * Vem do uso real do proprietario, registrado nas skills: sai em planilha Excel ou CSV, e traz
 * ID do produto, nome em MAIUSCULAS e frequentemente sem acento, grupo, e valor de venda
 * liquida. Portanto tudo aqui e defensivo: cabecalho por nome aproximado, virgula ou
 * ponto e virgula, decimal brasileiro ou americano.
 *
 * SO CSV, e a razao e tecnica e nao preguica: o plano gratuito do Cloudflare Workers da 10 ms
 * de CPU por invocacao (N22), e descompactar um XLSX (zip mais XML) nao cabe nisso. A
 * exportacao em CSV resolve, e o botao de importar planilha no painel cobre o caso de alguem
 * so conseguir Excel.
 *
 * A CHAVE DE JUNCAO E `produto_id_pdv`, que e o `id_altec`. O casamento por nome normalizado e
 * RESERVA, usada so quando o id vier vazio: `RUCOLA` contra `Rúcola` depende de regra de
 * normalizacao que muda com o tempo, e identificador estavel nao.
 */

export interface LinhaVenda {
  dia_operacional: string
  produto_id_pdv: string | null
  produto_nome_norm: string
  unidades: number | null
  valor_liquido: number
}

export interface ResultadoR3 {
  linhas: LinhaVenda[]
  erros: string[]
  /** Quantas linhas vieram sem id e vao depender do casamento por nome. */
  sem_id: number
}

/**
 * Normaliza nome para o formato do R3: maiusculas, sem acento, espaco colapsado.
 * Usada nas duas pontas (aqui e no cadastro de `item_cardapio`), senao a reserva nao casa.
 */
export function normalizaNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Decimal brasileiro (1.234,56) ou americano (1234.56). Devolve null se nao for numero. */
export function numeroBr(bruto: string): number | null {
  const limpo = bruto.replace(/[R$\s]/g, '').trim()
  if (limpo === '') return null
  // Se tem virgula E ponto, o ultimo separador e o decimal.
  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')
  let normalizado = limpo
  if (temVirgula && temPonto) {
    normalizado =
      limpo.lastIndexOf(',') > limpo.lastIndexOf('.')
        ? limpo.replace(/\./g, '').replace(',', '.')
        : limpo.replace(/,/g, '')
  } else if (temVirgula) {
    normalizado = limpo.replace(',', '.')
  }
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

/** Divide uma linha de CSV respeitando aspas. Aceita virgula, ponto e virgula ou tabulacao. */
export function divideLinha(linha: string, separador: string): string[] {
  const campos: string[] = []
  let atual = ''
  let dentroDeAspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]!
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else {
        dentroDeAspas = !dentroDeAspas
      }
    } else if (c === separador && !dentroDeAspas) {
      campos.push(atual)
      atual = ''
    } else {
      atual += c
    }
  }
  campos.push(atual)
  return campos.map((c) => c.trim())
}

function detectaSeparador(cabecalho: string): string {
  const candidatos = [';', ',', '\t']
  let melhor = ';'
  let maior = 0
  for (const c of candidatos) {
    const n = cabecalho.split(c).length
    if (n > maior) {
      maior = n
      melhor = c
    }
  }
  return melhor
}

/**
 * Acha o indice de uma coluna por qualquer um dos nomes aproximados.
 *
 * Casa em tres passadas, e a ordem importa: exato, depois palavra inteira, e so depois
 * substring, e substring apenas para alias com 5 letras ou mais.
 *
 * O motivo da terceira regra veio de um teste que falhou: o alias `ID` casava por substring
 * dentro de `VENDA LIQUIDA`, porque `LIQUIDA` contem `IDA`. Um cabecalho variante colocaria o
 * valor da venda na coluna de identificador do produto, e o cruzamento com o cardapio passaria
 * a casar contra numero. Alias curto so casa como palavra inteira.
 */
function achaColuna(cabecalhos: readonly string[], nomes: readonly string[]): number {
  const norm = cabecalhos.map((c) => normalizaNome(c))
  const palavras = norm.map((c) => c.split(/[^A-Z0-9]+/).filter((p) => p !== ''))

  for (const nome of nomes) {
    const alvo = normalizaNome(nome)
    const exato = norm.indexOf(alvo)
    if (exato !== -1) return exato
  }
  for (const nome of nomes) {
    const alvo = normalizaNome(nome)
    const alvoPalavras = alvo.split(' ')
    // Palavra inteira: todas as palavras do alias aparecem como palavras do cabecalho.
    const porPalavra = palavras.findIndex((ps) => alvoPalavras.every((a) => ps.includes(a)))
    if (porPalavra !== -1) return porPalavra
  }
  for (const nome of nomes) {
    const alvo = normalizaNome(nome)
    if (alvo.replace(/ /g, '').length < 5) continue
    const parcial = norm.findIndex((c) => c.includes(alvo))
    if (parcial !== -1) return parcial
  }
  return -1
}

/**
 * Interpreta o conteudo de um R3 exportado.
 *
 * `diaOperacional` entra por parametro porque o corte do dia DENTRO do Altec e NAO VERIFICADO
 * (pergunta 4 do bloqueio A1). Enquanto o suporte nao responder, a data vem do arquivo ou de
 * quem importa, e a divergencia possivel fica declarada em vez de corrigida por adivinhacao.
 */
export function interpretaR3(conteudo: string, diaOperacional?: string): ResultadoR3 {
  const erros: string[] = []
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim() !== '')

  if (linhas.length < 2) {
    return { linhas: [], erros: ['arquivo vazio ou sem linha de dados'], sem_id: 0 }
  }

  const separador = detectaSeparador(linhas[0]!)
  const cabecalhos = divideLinha(linhas[0]!, separador)

  const iId = achaColuna(cabecalhos, ['id', 'codigo', 'cod', 'produto id', 'id produto'])
  const iNome = achaColuna(cabecalhos, ['produto', 'descricao', 'nome', 'item'])
  const iValor = achaColuna(cabecalhos, [
    'valor liquido',
    'venda liquida',
    'total liquido',
    'liquido',
    'valor',
    'total',
  ])
  const iQtd = achaColuna(cabecalhos, ['quantidade', 'qtd', 'unidades', 'qtde'])
  const iData = achaColuna(cabecalhos, ['data', 'dia', 'competencia'])

  if (iNome === -1) erros.push('coluna de nome do produto nao encontrada')
  if (iValor === -1) erros.push('coluna de valor liquido nao encontrada')
  if (erros.length > 0) {
    erros.push(`cabecalhos lidos: ${cabecalhos.join(' | ')}`)
    return { linhas: [], erros, sem_id: 0 }
  }

  const resultado: LinhaVenda[] = []
  let semId = 0

  for (let i = 1; i < linhas.length; i++) {
    const campos = divideLinha(linhas[i]!, separador)
    const nome = campos[iNome] ?? ''
    if (nome === '') continue

    // Linha de total costuma vir sem id e com rotulo agregador. Somar ela dobraria o
    // faturamento, e isso passaria sem ninguem notar.
    const nomeNorm = normalizaNome(nome)
    if (/^(TOTAL|TOTAIS|SUBTOTAL|GERAL|SOMA)\b/.test(nomeNorm)) continue

    const valor = numeroBr(campos[iValor] ?? '')
    if (valor === null) {
      erros.push(`linha ${i + 1}: valor ilegivel em "${campos[iValor] ?? ''}"`)
      continue
    }

    const idBruto = iId === -1 ? '' : (campos[iId] ?? '').trim()
    if (idBruto === '') semId++

    const dataBruta = iData === -1 ? '' : (campos[iData] ?? '').trim()
    const dia = diaOperacional ?? interpretaData(dataBruta)
    if (dia === null) {
      erros.push(`linha ${i + 1}: sem data no arquivo e sem dia informado na importacao`)
      continue
    }

    resultado.push({
      dia_operacional: dia,
      produto_id_pdv: idBruto === '' ? null : idBruto,
      produto_nome_norm: nomeNorm,
      unidades: iQtd === -1 ? null : numeroBr(campos[iQtd] ?? ''),
      valor_liquido: valor,
    })
  }

  return { linhas: resultado, erros, sem_id: semId }
}

/** Aceita AAAA-MM-DD e DD/MM/AAAA, que sao os dois formatos plausiveis de export brasileiro. */
export function interpretaData(bruto: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto)
  if (iso !== null) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(bruto)
  if (br !== null) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}
