// Document Generation Service
import supabase from './SupabaseClient';

class DocumentGenerationService {
  /**
   * Generate document from template
   */
  async generateDocument(templateId, clientId, customData = {}) {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (templateError) throw templateError;

      // Get client data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Merge data
      const templateData = {
        ...this.getClientPlaceholders(client),
        ...customData,
        generated_date: new Date().toLocaleDateString('en-ZA'),
        generated_time: new Date().toLocaleTimeString('en-ZA')
      };

      // Populate template
      const generatedContent = this.populateTemplate(template.template_content, templateData);

      // Save generated document
      const { data: generatedDoc, error: saveError } = await supabase
        .from('generated_documents')
        .insert({
          template_id: templateId,
          client_id: clientId,
          document_type: template.template_type,
          file_name: `${template.name}_${client.client_name}_${Date.now()}.${template.file_format}`,
          generated_data: templateData,
          status: 'draft'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      return {
        ...generatedDoc,
        content: generatedContent
      };
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }

  /**
   * Get client data as placeholders
   */
  getClientPlaceholders(client) {
    return {
      client_name: client.client_name || '',
      registration_number: client.registration_number || '',
      registration_date: client.registration_date 
        ? new Date(client.registration_date).toLocaleDateString('en-ZA') 
        : '',
      email: client.email || '',
      phone_number: client.phone_number || '',
      physical_address: client.physical_address || '',
      postal_address: client.postal_address || '',
      directors: client.directors || '',
      shareholders: client.shareholders || '',
      last_cipc_filed: client.last_cipc_filed 
        ? new Date(client.last_cipc_filed).toLocaleDateString('en-ZA') 
        : '',
      last_bo_filed: client.last_bo_filed 
        ? new Date(client.last_bo_filed).toLocaleDateString('en-ZA') 
        : ''
    };
  }

  /**
   * Populate template with data
   */
  populateTemplate(template, data) {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, value || '');
    }
    
    return result;
  }

  /**
   * Generate Annual Return form
   */
  async generateAnnualReturnForm(clientId, year) {
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      const formData = {
        ...this.getClientPlaceholders(client),
        filing_year: year,
        financial_year_end: client.financial_year_end || '',
        share_capital: client.share_capital || '',
        number_of_shares: client.number_of_shares || ''
      };

      // Create HTML form
      const htmlContent = this.generateARFormHTML(formData);

      const { data: generatedDoc, error } = await supabase
        .from('generated_documents')
        .insert({
          client_id: clientId,
          document_type: 'annual_return',
          file_name: `AR_${client.registration_number}_${year}.html`,
          generated_data: formData,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...generatedDoc,
        content: htmlContent
      };
    } catch (error) {
      console.error('Error generating AR form:', error);
      throw error;
    }
  }

  /**
   * Generate Beneficial Ownership form
   */
  async generateBeneficialOwnershipForm(clientId) {
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      const formData = this.getClientPlaceholders(client);

      // Create HTML form
      const htmlContent = this.generateBOFormHTML(formData);

      const { data: generatedDoc, error } = await supabase
        .from('generated_documents')
        .insert({
          client_id: clientId,
          document_type: 'beneficial_ownership',
          file_name: `BO_${client.registration_number}_${Date.now()}.html`,
          generated_data: formData,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...generatedDoc,
        content: htmlContent
      };
    } catch (error) {
      console.error('Error generating BO form:', error);
      throw error;
    }
  }

  /**
   * Generate compliance certificate
   */
  async generateComplianceCertificate(clientId) {
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      const today = new Date();
      const certificateData = {
        ...this.getClientPlaceholders(client),
        certificate_number: `CERT-${Date.now()}`,
        issue_date: today.toLocaleDateString('en-ZA'),
        valid_until: new Date(today.setMonth(today.getMonth() + 6)).toLocaleDateString('en-ZA')
      };

      const htmlContent = this.generateCertificateHTML(certificateData);

      const { data: generatedDoc, error } = await supabase
        .from('generated_documents')
        .insert({
          client_id: clientId,
          document_type: 'certificate',
          file_name: `Compliance_Certificate_${client.registration_number}.html`,
          generated_data: certificateData,
          status: 'final'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...generatedDoc,
        content: htmlContent
      };
    } catch (error) {
      console.error('Error generating certificate:', error);
      throw error;
    }
  }

  /**
   * Bulk generate documents for multiple clients
   */
  async bulkGenerateDocuments(clientIds, documentType) {
    const results = [];
    
    for (const clientId of clientIds) {
      try {
        let doc;
        switch (documentType) {
          case 'annual_return':
            doc = await this.generateAnnualReturnForm(clientId, new Date().getFullYear());
            break;
          case 'beneficial_ownership':
            doc = await this.generateBeneficialOwnershipForm(clientId);
            break;
          case 'certificate':
            doc = await this.generateComplianceCertificate(clientId);
            break;
          default:
            throw new Error('Unknown document type');
        }
        results.push({ clientId, success: true, document: doc });
      } catch (error) {
        results.push({ clientId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Generate AR Form HTML
   */
  generateARFormHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Annual Return - ${data.client_name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .section { margin-bottom: 20px; }
    .field { margin-bottom: 10px; }
    .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ANNUAL RETURN FORM (AR1)</h1>
    <h2>COMPANIES AND INTELLECTUAL PROPERTY COMMISSION</h2>
  </div>
  
  <div class="section">
    <h3>COMPANY INFORMATION</h3>
    <div class="field"><span class="label">Company Name:</span> ${data.client_name}</div>
    <div class="field"><span class="label">Registration Number:</span> ${data.registration_number}</div>
    <div class="field"><span class="label">Registration Date:</span> ${data.registration_date}</div>
    <div class="field"><span class="label">Financial Year End:</span> ${data.financial_year_end || 'N/A'}</div>
  </div>
  
  <div class="section">
    <h3>CONTACT DETAILS</h3>
    <div class="field"><span class="label">Physical Address:</span> ${data.physical_address}</div>
    <div class="field"><span class="label">Postal Address:</span> ${data.postal_address}</div>
    <div class="field"><span class="label">Email:</span> ${data.email}</div>
    <div class="field"><span class="label">Phone:</span> ${data.phone_number}</div>
  </div>
  
  <div class="section">
    <h3>DIRECTORS</h3>
    <p>${data.directors || 'To be completed'}</p>
  </div>
  
  <div class="section">
    <h3>SHAREHOLDERS</h3>
    <p>${data.shareholders || 'To be completed'}</p>
  </div>
  
  <div class="section">
    <p>Generated on: ${data.generated_date} at ${data.generated_time}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate BO Form HTML
   */
  generateBOFormHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Beneficial Ownership - ${data.client_name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .section { margin-bottom: 20px; }
    .field { margin-bottom: 10px; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>BENEFICIAL OWNERSHIP DECLARATION</h1>
    <h2>COMPANIES AND INTELLECTUAL PROPERTY COMMISSION</h2>
  </div>
  
  <div class="section">
    <h3>COMPANY INFORMATION</h3>
    <div class="field"><span class="label">Company Name:</span> ${data.client_name}</div>
    <div class="field"><span class="label">Registration Number:</span> ${data.registration_number}</div>
  </div>
  
  <div class="section">
    <h3>BENEFICIAL OWNERS</h3>
    <p>${data.shareholders || 'To be completed with beneficial ownership details'}</p>
  </div>
  
  <div class="section">
    <p>Generated on: ${data.generated_date} at ${data.generated_time}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate Certificate HTML
   */
  generateCertificateHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Compliance Certificate - ${data.client_name}</title>
  <style>
    body { font-family: 'Georgia', serif; margin: 0; padding: 40px; background: #f5f5f5; }
    .certificate { background: white; padding: 60px; border: 10px solid #003366; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; }
    .title { font-size: 36px; color: #003366; margin-bottom: 10px; }
    .subtitle { font-size: 20px; color: #666; }
    .content { text-align: center; margin: 40px 0; }
    .company-name { font-size: 28px; font-weight: bold; color: #003366; margin: 20px 0; }
    .details { text-align: left; margin: 30px 0; }
    .field { margin: 10px 0; }
    .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 2px solid #003366; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="title">CERTIFICATE OF COMPLIANCE</div>
      <div class="subtitle">Companies and Intellectual Property Commission</div>
    </div>
    
    <div class="content">
      <p>This is to certify that</p>
      <div class="company-name">${data.client_name}</div>
      <p>Registration Number: ${data.registration_number}</p>
    </div>
    
    <div class="details">
      <div class="field"><strong>Certificate Number:</strong> ${data.certificate_number}</div>
      <div class="field"><strong>Issue Date:</strong> ${data.issue_date}</div>
      <div class="field"><strong>Valid Until:</strong> ${data.valid_until}</div>
      <div class="field"><strong>Status:</strong> Compliant</div>
    </div>
    
    <div class="footer">
      <p><strong>Agility Management System</strong></p>
      <p>Generated: ${data.generated_date}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get generated documents for a client
   */
  async getGeneratedDocuments(clientId, limit = 50) {
    const { data, error } = await supabase
      .from('generated_documents')
      .select('*, document_templates(name, template_type)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(documentId, status) {
    const { data, error } = await supabase
      .from('generated_documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export default new DocumentGenerationService();
