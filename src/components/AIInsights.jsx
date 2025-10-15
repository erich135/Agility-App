import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Alert, AlertDescription, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from './ui/card.jsx';
import { 
  BrainCircuit, 
  FileSearch, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Upload,
  Zap,
  Eye,
  FileText,
  Users,
  Calendar,
  Target,
  Lightbulb
} from 'lucide-react';
import AIDocumentService from '../lib/AIDocumentService';
import supabase from '../lib/SupabaseClient';
import ActivityLogger from '../lib/ActivityLogger';

const AIInsights = () => {
  const [insights, setInsights] = useState({
    compliance: [],
    recommendations: [],
    risks: [],
    opportunities: []
  });
  const [documentAnalysis, setDocumentAnalysis] = useState({
    total: 0,
    classified: 0,
    duplicates: 0,
    processed: 0
  });
  const [ocrResults, setOcrResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [processingFile, setProcessingFile] = useState(false);

  useEffect(() => {
    loadAIInsights();
    loadDocumentAnalysis();
  }, []);

  const loadAIInsights = async () => {
    try {
      // Get customer data
      const { data: customers } = await supabase
        .from('clients')
        .select('*')
        .limit(100);

      // Get documents
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .limit(100);

      // Get tasks and deadlines
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*');

      const { data: deadlines } = await supabase
        .from('document_deadlines')
        .select('*');

      // Generate insights for each customer
      let allInsights = {
        compliance: [],
        recommendations: [],
        risks: [],
        opportunities: []
      };

      customers?.forEach(customer => {
        const customerDocs = documents?.filter(d => d.client_id === customer.id) || [];
        const customerTasks = tasks?.filter(t => t.assigned_to === customer.id) || [];
        const customerDeadlines = deadlines?.filter(d => d.client_id === customer.id) || [];

        const customerInsights = AIDocumentService.generateInsights(
          customer,
          customerDocs,
          customerTasks,
          customerDeadlines
        );

        // Merge insights
        Object.keys(customerInsights).forEach(key => {
          allInsights[key] = [...allInsights[key], ...customerInsights[key]];
        });
      });

      setInsights(allInsights);
      
      await ActivityLogger.logSystem('AI insights generated', {
        compliance_issues: allInsights.compliance.length,
        recommendations: allInsights.recommendations.length,
        risks: allInsights.risks.length,
        opportunities: allInsights.opportunities.length
      });

    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentAnalysis = async () => {
    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('*');

      if (documents) {
        const total = documents.length;
        const classified = documents.filter(d => d.document_type && d.document_type !== 'other').length;
        const processed = documents.filter(d => d.extracted_data).length;
        
        setDocumentAnalysis({
          total,
          classified,
          duplicates: 0, // Would need duplicate detection logic
          processed
        });
      }
    } catch (error) {
      console.error('Error loading document analysis:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setProcessingFile(true);

    try {
      // Extract text using OCR
      const ocrResult = await AIDocumentService.extractTextFromDocument(file);
      
      // Classify document
      const classification = AIDocumentService.classifyDocument(file, ocrResult.text);
      
      // Extract structured data
      const structuredData = AIDocumentService.extractStructuredData(ocrResult.text, classification.type);
      
      // Check for duplicates (would need existing documents)
      const duplicateCheck = await AIDocumentService.checkForDuplicates(file, []);

      const result = {
        fileName: file.name,
        fileSize: file.size,
        ocrResult,
        classification,
        structuredData,
        duplicateCheck,
        timestamp: new Date().toISOString()
      };

      setOcrResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      await ActivityLogger.logSystem('Document processed with AI', {
        file_name: file.name,
        document_type: classification.type,
        confidence: classification.confidence,
        extracted_entities: Object.keys(structuredData.entities).length
      });

    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setProcessingFile(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Analyzing data with AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BrainCircuit className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Insights Dashboard</h1>
            <p className="text-gray-600">Intelligent document processing and business insights</p>
          </div>
        </div>
        
        {/* Quick Upload */}
        <div className="relative">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={processingFile}
          />
          <button 
            className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 
              ${processingFile 
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            disabled={processingFile}
          >
            {processingFile ? (
              <Zap className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{processingFile ? 'Processing...' : 'Test OCR'}</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documents Analyzed</p>
                <p className="text-3xl font-bold text-gray-900">{documentAnalysis.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Auto-Classified</p>
                <p className="text-3xl font-bold text-green-600">{documentAnalysis.classified}</p>
                <p className="text-xs text-gray-500">
                  {documentAnalysis.total > 0 
                    ? `${Math.round((documentAnalysis.classified / documentAnalysis.total) * 100)}% accuracy`
                    : '0% accuracy'}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">OCR Processed</p>
                <p className="text-3xl font-bold text-purple-600">{documentAnalysis.processed}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Insights</p>
                <p className="text-3xl font-bold text-orange-600">
                  {insights.compliance.length + insights.risks.length + insights.recommendations.length + insights.opportunities.length}
                </p>
              </div>
              <Lightbulb className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <BrainCircuit className="h-4 w-4" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center space-x-2">
            <FileSearch className="h-4 w-4" />
            <span>OCR Results</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Opportunities</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risks */}
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-red-700">High Priority Risks</h3>
                <Badge variant="destructive" className="ml-auto">
                  {insights.risks.length}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.risks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No high-priority risks detected</p>
                ) : (
                  insights.risks.slice(0, 5).map((risk, index) => (
                    <Alert key={index} className="border-red-200 bg-red-50">
                      <AlertDescription className="text-sm">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-red-800">{risk.message}</span>
                          {risk.deadline && (
                            <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                              {new Date(risk.deadline).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-700">AI Recommendations</h3>
                <Badge variant="secondary" className="ml-auto">
                  {insights.recommendations.length}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.recommendations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recommendations available</p>
                ) : (
                  insights.recommendations.slice(0, 5).map((rec, index) => (
                    <Alert key={index} className="border-blue-200 bg-blue-50">
                      <AlertDescription className="text-sm">
                        <div className="space-y-1">
                          <p className="font-medium text-blue-800">{rec.message}</p>
                          {rec.action && (
                            <p className="text-blue-600 text-xs">→ {rec.action}</p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OCR Results Tab */}
        <TabsContent value="ocr" className="space-y-6">
          {ocrResults.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileSearch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No OCR Results Yet</h3>
                <p className="text-gray-500 mb-4">Upload a document to see AI-powered text extraction and analysis</p>
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.tiff"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={processingFile}
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload Document</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ocrResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{result.fileName}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {AIDocumentService.getConfidenceDescription(result.classification.confidence)}
                        </Badge>
                        <Badge className={result.classification.type === 'other' ? 'bg-gray-500' : 'bg-green-500'}>
                          {result.classification.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* OCR Results */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Extracted Text</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {result.ocrResult.text || 'No text extracted'}
                        </p>
                      </div>
                    </div>

                    {/* Extracted Data */}
                    {Object.keys(result.structuredData.entities).length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Extracted Information</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(AIDocumentService.formatExtractedData(result.structuredData)).map(([key, value]) => (
                            <div key={key} className="bg-blue-50 p-2 rounded text-sm">
                              <span className="font-medium text-blue-900 capitalize">{key}:</span>
                              <span className="text-blue-700 ml-1">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Classification Details */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Confidence: {formatConfidence(result.classification.confidence)}</span>
                      <span>Processed: {new Date(result.timestamp).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Compliance Monitoring</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.compliance.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-green-700 mb-2">All Systems Green!</h4>
                  <p className="text-gray-600">No compliance issues detected across your client base</p>
                </div>
              ) : (
                insights.compliance.map((issue, index) => (
                  <Alert key={index} className={`${getSeverityColor(issue.severity)} border-l-4`}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{issue.message}</p>
                          {issue.action && (
                            <p className="text-sm mt-1 opacity-80">Action required: {issue.action}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                          {issue.severity?.toUpperCase()}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Growth Opportunities</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.opportunities.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-blue-700 mb-2">Analyzing Opportunities</h4>
                  <p className="text-gray-600">AI is analyzing your client data to identify growth opportunities</p>
                </div>
              ) : (
                insights.opportunities.map((opportunity, index) => (
                  <Alert key={index} className="border-green-200 bg-green-50">
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-green-800">{opportunity.message}</p>
                          {opportunity.action && (
                            <p className="text-sm mt-1 text-green-600">→ {opportunity.action}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          OPPORTUNITY
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIInsights;