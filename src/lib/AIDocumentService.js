import { createWorker } from 'tesseract.js';

/**
 * AI Document Intelligence Service
 * Provides OCR, smart classification, and duplicate detection capabilities
 */
class AIDocumentService {

  // ========== OCR & TEXT EXTRACTION ==========
  
  /**
   * Extract text from image or PDF using browser-based OCR
   * Uses Tesseract.js for client-side OCR processing
   */
  static async extractTextFromDocument(file) {
    try {
      // Use Tesseract.js for OCR processing
      const worker = await createWorker('eng');
      
      const { data: { text, confidence } } = await worker.recognize(file);
      await worker.terminate();
      
      return {
        success: true,
        text: text.trim(),
        confidence: confidence / 100 // Convert to 0-1 scale
      };
      
    } catch (error) {
      console.error('OCR extraction failed:', error);
      
      // Fallback: Basic file analysis
      return this.basicFileAnalysis(file);
    }
  }

  /**
   * Basic file analysis without OCR (fallback method)
   */
  static basicFileAnalysis(file) {
    const fileName = file.name.toLowerCase();
    let extractedData = {};
    
    // Pattern matching based on filename
    if (fileName.includes('vat') || fileName.includes('tax')) {
      extractedData.documentType = 'vat_certificate';
      extractedData.category = 'tax_documents';
    } else if (fileName.includes('registration') || fileName.includes('cert')) {
      extractedData.documentType = 'registration_certificate';  
      extractedData.category = 'compliance_documents';
    } else if (fileName.includes('id') || fileName.includes('identity')) {
      extractedData.documentType = 'id_document';
      extractedData.category = 'identity_documents';
    } else if (fileName.includes('paye') || fileName.includes('payroll')) {
      extractedData.documentType = 'paye_certificate';
      extractedData.category = 'payroll_documents';
    }
    
    return {
      success: true,
      text: `Analyzed: ${file.name}`,
      extractedData,
      confidence: 0.6
    };
  }

  /**
   * Smart data extraction from OCR text
   */
  static extractStructuredData(text, documentType = 'unknown') {
    const extractedData = {
      documentType,
      entities: {},
      dates: [],
      numbers: [],
      emails: [],
      phones: [],
      addresses: []
    };

    if (!text) return extractedData;

    // Extract common patterns
    extractedData.emails = this.extractEmails(text);
    extractedData.phones = this.extractPhoneNumbers(text);
    extractedData.dates = this.extractDates(text);
    extractedData.numbers = this.extractNumbers(text);
    extractedData.addresses = this.extractAddresses(text);

    // Document-specific extraction
    switch (documentType) {
      case 'registration_certificate':
        extractedData.entities.companyName = this.extractCompanyName(text);
        extractedData.entities.registrationNumber = this.extractRegistrationNumber(text);
        break;
      case 'vat_certificate':
        extractedData.entities.vatNumber = this.extractVATNumber(text);
        extractedData.entities.companyName = this.extractCompanyName(text);
        break;
      case 'id_document':
        extractedData.entities.idNumber = this.extractIDNumber(text);
        extractedData.entities.fullName = this.extractPersonName(text);
        break;
    }

    return extractedData;
  }

  // ========== SMART DOCUMENT CLASSIFICATION ==========

  /**
   * Automatically classify document type based on content and filename
   */
  static classifyDocument(file, extractedText = '') {
    const fileName = file.name.toLowerCase();
    const text = extractedText.toLowerCase();
    
    // Classification rules based on keywords and patterns
    const classificationRules = [
      {
        type: 'registration_certificate',
        confidence: 0.9,
        keywords: ['company registration', 'registration certificate', 'incorporated', 'cipc'],
        filePatterns: ['registration', 'cert', 'inc'],
        textPatterns: ['registration number', 'date of incorporation']
      },
      {
        type: 'vat_certificate',
        confidence: 0.9,
        keywords: ['vat', 'value added tax', 'vat number', 'tax certificate'],
        filePatterns: ['vat', 'tax'],
        textPatterns: ['vat number', 'vat registration']
      },
      {
        type: 'paye_certificate',
        confidence: 0.85,
        keywords: ['paye', 'pay as you earn', 'payroll tax', 'paye number'],
        filePatterns: ['paye', 'payroll'],
        textPatterns: ['paye reference', 'employer number']
      },
      {
        type: 'id_document',
        confidence: 0.8,
        keywords: ['identity document', 'id number', 'south african id'],
        filePatterns: ['id', 'identity'],
        textPatterns: ['identity number', 'id no']
      },
      {
        type: 'bank_statement',
        confidence: 0.85,
        keywords: ['bank statement', 'account statement', 'balance'],
        filePatterns: ['statement', 'bank'],
        textPatterns: ['account balance', 'transaction']
      }
    ];

    let bestMatch = { type: 'other', confidence: 0 };

    for (const rule of classificationRules) {
      let score = 0;
      let matches = 0;

      // Check filename patterns
      rule.filePatterns.forEach(pattern => {
        if (fileName.includes(pattern)) {
          score += 0.3;
          matches++;
        }
      });

      // Check keywords in filename
      rule.keywords.forEach(keyword => {
        if (fileName.includes(keyword.toLowerCase())) {
          score += 0.2;
          matches++;
        }
      });

      // Check text content
      rule.textPatterns.forEach(pattern => {
        if (text.includes(pattern)) {
          score += 0.4;
          matches++;
        }
      });

      rule.keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 0.1;
          matches++;
        }
      });

      const finalConfidence = Math.min(rule.confidence, score);

      if (finalConfidence > bestMatch.confidence) {
        bestMatch = {
          type: rule.type,
          confidence: finalConfidence,
          matchCount: matches
        };
      }
    }

    return bestMatch;
  }

  // ========== DUPLICATE DETECTION ==========

  /**
   * Check if document might be a duplicate
   */
  static async checkForDuplicates(file, existingDocuments = [], extractedData = {}) {
    const duplicates = [];
    
    for (const doc of existingDocuments) {
      const similarity = this.calculateSimilarity(file, doc, extractedData);
      
      if (similarity.score > 0.8) {
        duplicates.push({
          document: doc,
          similarity: similarity.score,
          reasons: similarity.reasons
        });
      }
    }

    return {
      isDuplicate: duplicates.length > 0,
      duplicates: duplicates.sort((a, b) => b.similarity - a.similarity),
      confidence: duplicates.length > 0 ? duplicates[0].similarity : 0
    };
  }

  /**
   * Calculate similarity between two documents
   */
  static calculateSimilarity(newFile, existingDoc, extractedData = {}) {
    let score = 0;
    const reasons = [];

    // File name similarity
    const nameSimilarity = this.stringSimilarity(
      newFile.name.toLowerCase(),
      existingDoc.file_name?.toLowerCase() || ''
    );
    
    if (nameSimilarity > 0.8) {
      score += 0.4;
      reasons.push(`Similar filename (${Math.round(nameSimilarity * 100)}% match)`);
    }

    // File size similarity (within 5%)
    if (existingDoc.file_size) {
      const sizeDiff = Math.abs(newFile.size - existingDoc.file_size) / existingDoc.file_size;
      if (sizeDiff < 0.05) {
        score += 0.3;
        reasons.push('Similar file size');
      }
    }

    // Document type match
    if (extractedData.documentType && existingDoc.document_type === extractedData.documentType) {
      score += 0.3;
      reasons.push('Same document type');
    }

    return { score, reasons };
  }

  // ========== AI INSIGHTS & RECOMMENDATIONS ==========

  /**
   * Generate AI-powered insights and recommendations
   */
  static generateInsights(customerData, documents = [], tasks = [], deadlines = []) {
    const insights = {
      compliance: [],
      recommendations: [],
      risks: [],
      opportunities: []
    };

    // Compliance analysis
    const requiredDocs = ['registration_certificate', 'vat_certificate', 'paye_certificate'];
    const uploadedTypes = documents.map(doc => doc.document_type);
    
    requiredDocs.forEach(docType => {
      if (!uploadedTypes.includes(docType)) {
        insights.compliance.push({
          type: 'missing_document',
          severity: 'high',
          message: `Missing ${docType.replace('_', ' ')} - required for compliance`,
          action: `Upload ${docType.replace('_', ' ')}`
        });
      }
    });

    // Deadline analysis
    const urgentDeadlines = deadlines.filter(d => {
      const daysUntil = Math.ceil((new Date(d.deadline_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && d.status === 'pending';
    });

    urgentDeadlines.forEach(deadline => {
      insights.risks.push({
        type: 'urgent_deadline',
        severity: 'high',
        message: `${deadline.description} due within 7 days`,
        deadline: deadline.deadline_date
      });
    });

    // Document organization recommendations
    if (documents.length > 10 && !documents.some(d => d.description)) {
      insights.recommendations.push({
        type: 'organization',
        message: 'Consider adding descriptions to documents for better organization',
        action: 'Add document descriptions'
      });
    }

    // Growth opportunities
    if (customerData.company_vat_number && !documents.some(d => d.document_type === 'financial_statement')) {
      insights.opportunities.push({
        type: 'service_expansion',
        message: 'Customer is VAT registered - consider offering financial services',
        action: 'Propose additional services'
      });
    }

    return insights;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Extract email addresses from text
   */
  static extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Extract phone numbers from text
   */
  static extractPhoneNumbers(text) {
    const phoneRegex = /(?:\+27|0)(?:\d{2})\s?(?:\d{3})\s?(?:\d{4})/g;
    return text.match(phoneRegex) || [];
  }

  /**
   * Extract dates from text
   */
  static extractDates(text) {
    const dateRegex = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g;
    return text.match(dateRegex) || [];
  }

  /**
   * Extract numbers from text
   */
  static extractNumbers(text) {
    const numberRegex = /\b\d+\b/g;
    return text.match(numberRegex) || [];
  }

  /**
   * Extract South African company registration numbers
   */
  static extractRegistrationNumber(text) {
    const regexes = [
      /\b\d{4}\/\d{6}\/\d{2}\b/g, // Standard format
      /\b\d{10}\b/g // Alternative format
    ];
    
    for (const regex of regexes) {
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    return null;
  }

  /**
   * Extract VAT numbers
   */
  static extractVATNumber(text) {
    const vatRegex = /\b\d{10}\b/g;
    return text.match(vatRegex)?.[0] || null;
  }

  /**
   * Extract ID numbers
   */
  static extractIDNumber(text) {
    const idRegex = /\b\d{13}\b/g;
    return text.match(idRegex)?.[0] || null;
  }

  /**
   * Extract company names (basic pattern matching)
   */
  static extractCompanyName(text) {
    const lines = text.split('\n').map(line => line.trim());
    // Usually company name is in the first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.length > 3 && line.length < 100 && !line.match(/^\d/)) {
        return line;
      }
    }
    return null;
  }

  /**
   * Extract person names
   */
  static extractPersonName(text) {
    const nameRegex = /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
    const matches = text.match(nameRegex);
    return matches?.[0] || null;
  }

  /**
   * Extract addresses
   */
  static extractAddresses(text) {
    const addressLines = text.split('\n').filter(line => 
      line.length > 10 && 
      (line.includes('Street') || line.includes('Road') || line.includes('Ave') || 
       line.includes('St') || line.includes('Rd') || line.match(/\d{4}/))
    );
    return addressLines;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  static stringSimilarity(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }
    
    const distance = track[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Get confidence level description
   */
  static getConfidenceDescription(confidence) {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    if (confidence >= 0.3) return 'Low';
    return 'Very Low';
  }

  /**
   * Format extracted data for display
   */
  static formatExtractedData(extractedData) {
    const formatted = {};
    
    Object.keys(extractedData.entities || {}).forEach(key => {
      if (extractedData.entities[key]) {
        formatted[key.replace(/([A-Z])/g, ' $1').toLowerCase()] = extractedData.entities[key];
      }
    });
    
    if (extractedData.emails?.length > 0) {
      formatted['emails'] = extractedData.emails.join(', ');
    }
    
    if (extractedData.phones?.length > 0) {
      formatted['phone numbers'] = extractedData.phones.join(', ');
    }
    
    if (extractedData.dates?.length > 0) {
      formatted['dates found'] = extractedData.dates.join(', ');
    }
    
    return formatted;
  }
}

export default AIDocumentService;