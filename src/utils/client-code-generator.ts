/**
 * Gera um código de cliente alfanumérico único (ex: CL12345).
 * Nota: A unicidade final deve ser garantida pelo banco de dados (coluna UNIQUE).
 * Este é um gerador simples baseado em timestamp e um número aleatório.
 */
export const generateClientCode = (): string => {
  // Usa o timestamp atual (em milissegundos) e um número aleatório para garantir alta probabilidade de unicidade
  const timestampPart = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
  const randomPart = Math.floor(Math.random() * 900) + 100; // Número aleatório de 3 dígitos
  
  return `CL${timestampPart}${randomPart}`;
};