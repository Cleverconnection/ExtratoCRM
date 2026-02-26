import { normalizeText } from './normalizeText'

const CATEGORY_ALIAS_MAP = {
  mercado: 'Alimentacao',
  mercados: 'Alimentacao',
  marketplace: 'Mercado Livre',
  'pix marketplace': 'Mercado Livre',
  'mercado livre': 'Mercado Livre',
  alimentacao: 'Alimentacao',
  alimento: 'Alimentacao',
  alimentos: 'Alimentacao',
  clinica: 'Clinica Exame',
  clinicas: 'Clinica Exame',
  exame: 'Clinica Exame',
  exames: 'Clinica Exame',
  'clinica exame': 'Clinica Exame',
  restaurante: 'Alimentacao',
  restaurantes: 'Alimentacao',
  combustivel: 'Transporte',
  combustiveis: 'Transporte',
  gasolina: 'Transporte',
  posto: 'Transporte',
  transporte: 'Transporte',
  transportes: 'Transporte',
  transferencia: 'Transferencias',
  transferencias: 'Transferencias',
  curso: 'Cursos',
  cursos: 'Cursos',
  uniforme: 'Vestimenta',
  uniformes: 'Vestimenta',
  'cartao/fatura': 'Cartao/Fatura',
  'cartao fatura': 'Cartao/Fatura',
  cliente: 'Clientes',
  clientes: 'Clientes',
  funcionario: 'Funcionarios',
  funcionarios: 'Funcionarios',
  parceiro: 'Parceiros',
  parceiros: 'Parceiros',
  locacao: 'Locacao de Equipamentos',
  'locacao de equipamento': 'Locacao de Equipamentos',
  'locacao de equipamentos': 'Locacao de Equipamentos',
  material: 'Materiais',
  materiais: 'Materiais',
  equipamento: 'Equipamentos',
  equipamentos: 'Equipamentos',
  vestimento: 'Vestimenta',
  vestimentos: 'Vestimenta',
  vestimenta: 'Vestimenta',
  vestimentas: 'Vestimenta',
  vestuario: 'Vestimenta',
  roupas: 'Vestimenta',
  imposto: 'Impostos',
  impostos: 'Impostos',
  investimento: 'Investimentos',
  investimentos: 'Investimentos',
  contabilidade: 'Contabilidade',
  contabil: 'Contabilidade',
  pedagio: 'Pedagios',
  pedagios: 'Pedagios',
  software: 'Software/Sites',
  sites: 'Software/Sites',
  'software/sites': 'Software/Sites',
  comercio: 'Comercio Local',
  'comercio local': 'Comercio Local',
  generico: 'Generica',
  generica: 'Generica',
  receitas: 'Receitas',
  receita: 'Receitas',
}

function toTitleCase(label) {
  return label
    .split(' ')
    .filter(Boolean)
    .map((word) =>
      word
        .split('/')
        .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
        .join('/'),
    )
    .join(' ')
}

export function canonicalizeCategory(rawCategory, transactionValue = 0) {
  const normalized = normalizeText(rawCategory).replace(/[^\w/\s]/g, '').trim()

  if (!normalized) {
    return transactionValue >= 0 ? 'Receitas' : 'Generica'
  }

  if (CATEGORY_ALIAS_MAP[normalized]) {
    return CATEGORY_ALIAS_MAP[normalized]
  }

  return toTitleCase(normalized)
}
