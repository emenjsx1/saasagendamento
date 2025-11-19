/**
 * Converts a string to a URL-friendly slug (lowercase, hyphenated).
 * @param text The input string (e.g., 'Barbearia do João')
 * @returns The slugified string (e.g., 'barbearia-do-joao')
 */
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores/multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Generates a unique short code (e.g., 4 random digits).
 */
const generateShortCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Generates a unique business slug based on the name and a short code.
 * @param name The business name.
 * @returns A slug string (e.g., 'barbearia-do-joao-1234')
 */
export const generateBusinessSlug = (name: string): string => {
    const baseSlug = slugify(name);
    const shortCode = generateShortCode();
    return `${baseSlug}-${shortCode}`;
};