import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export async function generateWordPair(interests: string): Promise<[string, string]> {
    const prompt = `Generate 10 pairs of related but different words based on the interests: ${interests}. Each pair should be similar but distinct enough to create an interesting game dynamic. Format the response as a JSON array of objects with 'common' and 'undercover' properties.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const response = await model.generateContent(prompt);
    const result = response.response.text();
    
    try {
        // Clean the response text to ensure it's valid JSON
        const cleanedResult = result.replace(/```json\n|\n```/g, '').trim();
        const pairs = JSON.parse(cleanedResult);
        
        // Validate the pairs array
        if (!Array.isArray(pairs) || pairs.length === 0) {
            throw new Error('Invalid response format');
        }
        
        const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
        
        if (!randomPair.common || !randomPair.undercover) {
            throw new Error('Invalid word pair format');
        }
        
        return [randomPair.common, randomPair.undercover];
    } catch (error) {
        console.error('Word generation error:', error);
        throw new Error('Failed to parse word pairs');
    }
}