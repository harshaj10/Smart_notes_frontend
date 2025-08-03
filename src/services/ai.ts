// Types for AI suggestions

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface AISuggestion {
  text: string;
  confidence: number;
}

/**
 * AI Suggestion Service
 * This service provides intelligent content suggestions for writing notes using Google Gemini API
 */
class AISuggestionService {
  private apiKey: string;
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private useRealAPI: boolean;
  
  constructor() {
    // Direct API key access - remove any processing that might interfere
    this.apiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
    this.useRealAPI = false;
    
    console.log("Initializing Gemini API Service...");
    console.log("API Key length:", this.apiKey ? this.apiKey.length : 0);
    
    try {
      // Only initialize if API key is available
      if (this.apiKey && this.apiKey.length > 0) {
        console.log("Gemini API key found, initializing model...");
        
        // Initialize Google Generative AI with the API key
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        
        // Configure the model (Gemini Pro is good for text tasks)
        this.model = this.genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        });
        
        this.useRealAPI = true;
        console.log("Google Gemini API initialized successfully");
      } else {
        console.warn("No Gemini API key found, falling back to simulations");
      }
    } catch (error) {
      console.error("Failed to initialize Google Gemini API:", error);
    }
  }
  
  /**
   * Get AI suggestions based on the current text content
   * @param content The current note content
   * @param maxSuggestions Maximum number of suggestions to return
   * @returns Array of AI suggestions
   */
  async getSuggestions(content: string, maxSuggestions: number = 3): Promise<AISuggestion[]> {
    try {
      // Always try to use the real API first if the model is initialized
      if (this.useRealAPI && this.model) {
        console.log("Using Gemini API for suggestions");
        return await this.getGeminiSuggestions(content, maxSuggestions);
      } else {
        console.log("Using simulated suggestions (API initialized:", this.useRealAPI, ")");
        // Fall back to simulated suggestions
        return this.simulateSuggestions(content, maxSuggestions);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      return [];
    }
  }
  
  /**
   * Get AI completion for a paragraph using Gemini
   * @param partialText The incomplete paragraph text
   * @returns Completed text suggestion
   */
  async getCompletion(partialText: string): Promise<string> {
    try {
      if (this.useRealAPI && this.model) {
        console.log("Using Gemini API for completion");
        return await this.getGeminiCompletion(partialText);
      } else {
        // Fall back to simulated completion
        console.log("Using simulated completion");
        return this.simulateCompletion(partialText);
      }
    } catch (error) {
      console.error('Error fetching AI completion:', error);
      return '';
    }
  }
  
  /**
   * Analyze the text and provide content improvement suggestions using AI
   * @param content The current note content
   * @returns Array of improvement suggestions
   */
  async analyzeContent(content: string): Promise<string[]> {
    try {
      if (this.useRealAPI && this.model) {
        console.log("Using Gemini API for content analysis");
        return await this.getGeminiContentAnalysis(content);
      } else {
        console.log("Using simulated analysis");
        // Fall back to simulated analysis
        return this.simulateContentAnalysis(content);
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      return [];
    }
  }
  
  /**
   * Generate a title suggestion based on content using AI
   * @param content The note content
   * @returns Suggested title
   */
  async suggestTitle(content: string): Promise<string> {
    try {
      if (this.useRealAPI && this.model) {
        console.log("Using Gemini API for title suggestion");
        return await this.getGeminiTitleSuggestion(content);
      } else {
        console.log("Using simulated title suggestion");
        // Fall back to simulated title suggestion
        return this.simulateTitleSuggestion(content);
      }
    } catch (error) {
      console.error('Error generating title suggestion:', error);
      return '';
    }
  }
  
  // GEMINI API METHODS
  
  /**
   * Get suggestions from Gemini API
   */
  private async getGeminiSuggestions(content: string, maxSuggestions: number): Promise<AISuggestion[]> {
    if (!this.model) {
      console.warn("Gemini model not initialized, falling back to simulations");
      return this.simulateSuggestions(content, maxSuggestions);
    }
    
    try {
      // Extract the last few paragraphs for context
      const contextText = this.getContextText(content);
      
      const prompt = `You are an AI writing assistant. Generate ${maxSuggestions} unique, helpful suggestions to continue the user's note. 
      Each suggestion should be 1-2 sentences and contextually relevant.
      
      Here's the user's current note: "${contextText}"
      
      Provide ${maxSuggestions} different suggestions to continue, formatted as a numbered list.`;
      
      console.log("Sending suggestion prompt to Gemini API...");
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      console.log("Received Gemini API response for suggestions");
      
      const suggestions: AISuggestion[] = [];
      
      // Parse the response - it's usually a numbered list
      const suggestionTexts = responseText
        .split(/\d+\./)
        .filter((text: string) => text.trim().length > 0)
        .map((text: string) => text.trim())
        .slice(0, maxSuggestions);
      
      // Add confidence scores (based on order - first suggestions are typically better)
      suggestionTexts.forEach((text: string, index: number) => {
        const confidence = 1 - (index * 0.05);
        suggestions.push({
          text,
          confidence: confidence > 0.7 ? confidence : 0.7
        });
      });
      
      return suggestions;
    } catch (error) {
      console.error("Error generating suggestions with Gemini:", error);
      return this.simulateSuggestions(content, maxSuggestions);
    }
  }
  
  /**
   * Get text completion from Gemini API
   */
  private async getGeminiCompletion(partialText: string): Promise<string> {
    if (!this.model) {
      console.warn("Gemini model not initialized, falling back to simulations");
      return this.simulateCompletion(partialText);
    }
    
    try {
      const prompt = `Complete this text with a relevant continuation, keeping the same tone and style. 
      Provide only the continuation text, don't repeat the original text.
      
      Original text: "${partialText}"`;
      
      console.log("Sending completion prompt to Gemini API...");
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      console.log("Received Gemini API response for completion");
      return response.text().trim();
    } catch (error) {
      console.error("Error generating completion with Gemini:", error);
      return this.simulateCompletion(partialText);
    }
  }
  
  /**
   * Get content analysis from Gemini API
   */
  private async getGeminiContentAnalysis(content: string): Promise<string[]> {
    if (!this.model) {
      console.warn("Gemini model not initialized, falling back to simulations");
      return this.simulateContentAnalysis(content);
    }
    
    try {
      const prompt = `Analyze this text and provide 3-5 specific suggestions to improve clarity, structure, or style. 
      Be concise and actionable. Format each suggestion as a separate point.
      
      Text to analyze: "${content}"`;
      
      console.log("Sending analysis prompt to Gemini API...");
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      console.log("Received Gemini API response for analysis");
      
      // Parse the response - usually a numbered or bulleted list
      return responseText
        .split(/\d+\.|\n-\s/)
        .filter((text: string) => text.trim().length > 0)
        .map((text: string) => text.trim());
    } catch (error) {
      console.error("Error generating content analysis with Gemini:", error);
      return this.simulateContentAnalysis(content);
    }
  }
  
  /**
   * Get title suggestion from Gemini API
   */
  private async getGeminiTitleSuggestion(content: string): Promise<string> {
    if (!this.model) {
      console.warn("Gemini model not initialized, falling back to simulations");
      return this.simulateTitleSuggestion(content);
    }
    
    try {
      const prompt = `Generate a concise, relevant title for this text. Provide only the title text.
      
      Text: "${content}"`;
      
      console.log("Sending title prompt to Gemini API...");
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      console.log("Received Gemini API response for title");
      
      // Clean up response (remove quotes if present)
      let title = response.text().trim();
      if (title.startsWith('"') && title.endsWith('"')) {
        title = title.slice(1, -1);
      }
      
      return title;
    } catch (error) {
      console.error("Error generating title suggestion with Gemini:", error);
      return this.simulateTitleSuggestion(content);
    }
  }
  
  // Helper function to get context from longer content
  private getContextText(content: string): string {
    // If content is short, use all of it
    if (content.length < 500) {
      return content;
    }
    
    // Otherwise, use the last 500 characters to get recent context
    return content.slice(-500);
  }
  
  // SIMULATION METHODS - unchanged from original
  // These methods simulate AI responses for demo purposes
  
  private simulateSuggestions(content: string, maxSuggestions: number): AISuggestion[] {
    // Extract the last sentence or phrase to generate contextual suggestions
    const lastSentence = this.getLastSentence(content);
    const suggestions: AISuggestion[] = [];
    
    if (!lastSentence) {
      return [
        { text: "Let's start by outlining the main points.", confidence: 0.92 },
        { text: "I'd like to discuss the following topics:", confidence: 0.85 },
        { text: "Today I want to focus on key aspects of this subject.", confidence: 0.78 }
      ].slice(0, maxSuggestions);
    }
    
    // Sample logic for generating contextual suggestions
    if (lastSentence.toLowerCase().includes('meeting')) {
      suggestions.push(
        { text: "During the meeting, we discussed several important points that need follow-up.", confidence: 0.95 },
        { text: "The meeting outcomes included specific action items for each team member.", confidence: 0.87 },
        { text: "We scheduled a follow-up meeting for next week to review progress.", confidence: 0.82 }
      );
    } else if (lastSentence.toLowerCase().includes('idea') || lastSentence.toLowerCase().includes('concept')) {
      suggestions.push(
        { text: "This idea could be developed further by considering the following aspects:", confidence: 0.94 },
        { text: "The concept builds upon existing research in this domain.", confidence: 0.88 },
        { text: "To implement this idea effectively, we should consider potential challenges such as:", confidence: 0.85 }
      );
    } else if (lastSentence.toLowerCase().includes('problem') || lastSentence.toLowerCase().includes('issue')) {
      suggestions.push(
        { text: "To address this problem, we should consider multiple approaches including:", confidence: 0.93 },
        { text: "This issue can be resolved by implementing the following solution:", confidence: 0.89 },
        { text: "The problem stems from several root causes that need to be addressed:", confidence: 0.84 }
      );
    } else {
      // Default suggestions
      suggestions.push(
        { text: "Furthermore, it's important to consider the implications of this.", confidence: 0.90 },
        { text: "Building on this point, we can explore additional aspects such as:", confidence: 0.85 },
        { text: "This relates to several key factors worth examining in detail.", confidence: 0.80 },
        { text: "An interesting perspective to consider is how this affects the overall outcome.", confidence: 0.75 },
        { text: "To expand on this further, let's analyze the following components:", confidence: 0.70 }
      );
    }
    
    return suggestions.slice(0, maxSuggestions);
  }
  
  private simulateCompletion(partialText: string): string {
    // Simple logic for simulating text completion
    const lowercaseText = partialText.toLowerCase();
    
    if (lowercaseText.includes('meeting')) {
      return partialText + " agenda items were discussed thoroughly and action points were assigned to team members with clear deadlines.";
    } else if (lowercaseText.includes('project')) {
      return partialText + " timeline needs to be adjusted to accommodate the new requirements while ensuring we meet the final deadline.";
    } else if (lowercaseText.includes('idea')) {
      return partialText + " could revolutionize how we approach this problem, especially if we focus on implementing it incrementally.";
    } else if (lowercaseText.endsWith('i think')) {
      return partialText + " this approach offers the best balance between innovation and practicality given our constraints.";
    } else if (lowercaseText.includes('challenge')) {
      return partialText + " presents an opportunity to rethink our strategy and develop more resilient processes.";
    } else {
      return partialText + " provides valuable insights that can help guide our decision-making process going forward.";
    }
  }
  
  private simulateContentAnalysis(content: string): string[] {
    const suggestions: string[] = [];
    
    // Simple analysis based on content length and keywords
    if (content.length < 100) {
      suggestions.push("Consider expanding on your main points to provide more context.");
    }
    
    if (!content.includes('.') && content.length > 50) {
      suggestions.push("Try breaking your content into smaller sentences for better readability.");
    }
    
    const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
    if (paragraphs.length === 1 && content.length > 200) {
      suggestions.push("Consider organizing your content into multiple paragraphs for better structure.");
    }
    
    // Check for common filler words
    const fillerWords = ['very', 'really', 'basically', 'actually', 'definitely'];
    const hasFillerWords = fillerWords.some(word => 
      content.toLowerCase().includes(` ${word} `)
    );
    
    if (hasFillerWords) {
      suggestions.push("Consider replacing filler words with more specific language for stronger writing.");
    }
    
    // Add more sophisticated analysis suggestions
    suggestions.push("Try adding specific examples to support your key points.");
    
    if (content.length > 300) {
      suggestions.push("Consider adding subheadings to organize your content for better readability.");
    }
    
    return suggestions;
  }
  
  private getLastSentence(text: string): string {
    // Simple implementation to get the last sentence or phrase
    const sentences = text.split(/[.!?]\s+/);
    return sentences[sentences.length - 1] || '';
  }
  
  private simulateTitleSuggestion(content: string): string {
    // Extract potential keywords for the title
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('meeting')) {
      return "Meeting Notes: Key Discussion Points and Action Items";
    } else if (lowerContent.includes('project')) {
      return "Project Plan: Milestones, Resources, and Timeline";
    } else if (lowerContent.includes('idea') || lowerContent.includes('concept')) {
      return "Concept Development: Innovative Ideas and Implementation Strategies";
    } else if (lowerContent.includes('research')) {
      return "Research Findings: Analysis and Key Insights";
    } else if (lowerContent.includes('product')) {
      return "Product Analysis: Features, Market Position, and Development Roadmap";
    } else {
      return "Key Insights and Strategic Observations";
    }
  }
}

// Export an instance of the service
const aiService = new AISuggestionService();
export default aiService;