export async function retryRequest<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      console.warn(`Retrying request (${attempt + 1}/${retries})... `, error.message);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Retraso exponencial - 2s para el 2do intento - 4s para el 3er intento
    }
  }
}
