import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Alert, AlertDescription, Badge } from './ui/card.jsx';
import { 
  Upload, 
  FileText, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Brain,
  Copy,
  Users,
  Tag,
  Calendar,
  FileCheck,
  Sparkles
} from 'lucide-react';
import AIDocumentService from '../lib/AIDocumentService';
import supabase from '../lib/SupabaseClient';
import ActivityLogger from '../lib/ActivityLogger';
import { useAuth } from '../App';

const SmartDocumentUpload = ({ clientId, onUploadComplete }) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  useEffect(() => {
    if (clientId) {
      loadExistingDocuments();
    }
  }, [clientId]);

  const loadExistingDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      setExistingDocuments(data || []);
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setResults([]);
  };

  const processFilesWithAI = async () => {
    if (selectedFiles.length === 0) return;

    setProcessing(true);
    const fileResults = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: { stage: 'analyzing', progress: 25 }
      }));

      try {
        // Step 1: OCR Text Extraction
        const ocrResult = await AIDocumentService.extractTextFromDocument(file);
        
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { stage: 'classifying', progress: 50 }
        }));

        // Step 2: Document Classification
        const classification = AIDocumentService.classifyDocument(file, ocrResult.text);
        
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { stage: 'extracting', progress: 75 }
        }));

        // Step 3: Data Extraction
        const structuredData = AIDocumentService.extractStructuredData(
          ocrResult.text, 
          classification.type
        );

        // Step 4: Duplicate Detection
        const duplicateCheck = await AIDocumentService.checkForDuplicates(
          file, 
          existingDocuments, 
          structuredData
        );

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { stage: 'complete', progress: 100 }
        }));

        const result = {
          file,
          ocrResult,
          classification,
          structuredData,
          duplicateCheck,
          canUpload: !duplicateCheck.isDuplicate || duplicateCheck.confidence < 0.9
        };

        fileResults.push(result);

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        fileResults.push({
          file,
          error: error.message,
          canUpload: false
        });

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { stage: 'error', progress: 100 }
        }));
      }
    }

    setResults(fileResults);
    setProcessing(false);

    await ActivityLogger.logDocument('AI document analysis completed', {
      client_id: clientId,
      files_processed: selectedFiles.length,
      successful_extractions: fileResults.filter(r => r.ocrResult?.success).length,
      duplicates_detected: fileResults.filter(r => r.duplicateCheck?.isDuplicate).length
    });
  };

  const uploadDocument = async (result) => {
    try {
      const { file, classification, structuredData, ocrResult } = result;
      
      // Create document record in database
      const { data: document, error } = await supabase
        .from('documents')
        .insert([{
          client_id: clientId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          document_type: classification.type,
          classification_confidence: classification.confidence,
          extracted_text: ocrResult.text,
          extracted_data: structuredData,
          uploaded_by: user.id,
          upload_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Upload file to storage
      const fileName = `${clientId}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (storageError) throw storageError;

      // Update document with storage path
      await supabase
        .from('documents')
        .update({ storage_path: fileName })
        .eq('id', document.id);

      await ActivityLogger.logDocument('Smart document uploaded', {
        client_id: clientId,
        document_id: document.id,
        file_name: file.name,
        document_type: classification.type,
        confidence: classification.confidence
      });

      // Update results to show success
      setResults(prev => prev.map(r => 
        r.file.name === file.name 
          ? { ...r, uploaded: true, documentId: document.id }
          : r
      ));

      if (onUploadComplete) {
        onUploadComplete(document);
      }

      return document;

    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };

  const getProgressStageText = (stage) => {
    switch (stage) {
      case 'analyzing': return 'Analyzing with OCR...';
      case 'classifying': return 'Classifying document...';
      case 'extracting': return 'Extracting data...';
      case 'complete': return 'Analysis complete';
      case 'error': return 'Processing failed';
      default: return 'Processing...';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Smart Document Upload</h3>
            <Badge variant="secondary" className="ml-2">AI-Powered</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Upload documents for automatic OCR, classification, and duplicate detection
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors relative">
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="smart-file-input"
              disabled={processing}
            />
            <label htmlFor="smart-file-input" className="cursor-pointer block">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
              <p className="text-sm text-gray-500">Supports PDF, images, and documents</p>
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Selected Files:</h4>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {uploadProgress[file.name] && (
                      <div className="text-right">
                        <p className="text-xs text-gray-600">
                          {getProgressStageText(uploadProgress[file.name].stage)}
                        </p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress[file.name].progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={processFilesWithAI}
                disabled={processing}
                className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 
                  ${processing 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'}`}
              >
                {processing ? (
                  <Zap className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                <span>{processing ? 'Processing with AI...' : 'Analyze with AI'}</span>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>AI Analysis Results</span>
          </h3>

          {results.map((result, index) => (
            <Card key={index} className={`${result.error ? 'border-red-200' : result.canUpload ? 'border-green-200' : 'border-yellow-200'}`}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* File Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-gray-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">{result.file.name}</h4>
                        <p className="text-sm text-gray-600">
                          {(result.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {result.error ? (
                        <Badge variant="destructive">Processing Failed</Badge>
                      ) : result.uploaded ? (
                        <Badge className="bg-green-500">Uploaded</Badge>
                      ) : result.canUpload ? (
                        <Badge className="bg-blue-500">Ready to Upload</Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                          Potential Duplicate
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Error Display */}
                  {result.error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-800">
                        Processing failed: {result.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* AI Analysis Results */}
                  {result.classification && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document Classification */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 flex items-center space-x-2">
                          <Tag className="h-4 w-4" />
                          <span>Document Type</span>
                        </h5>
                        <div className="flex items-center space-x-2">
                          <Badge className={getConfidenceColor(result.classification.confidence)}>
                            {result.classification.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {Math.round(result.classification.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>

                      {/* Extracted Data */}
                      {Object.keys(result.structuredData?.entities || {}).length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-gray-700 flex items-center space-x-2">
                            <Brain className="h-4 w-4" />
                            <span>Extracted Data</span>
                          </h5>
                          <div className="space-y-1">
                            {Object.entries(AIDocumentService.formatExtractedData(result.structuredData)).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="font-medium text-gray-600 capitalize">{key}:</span>
                                <span className="text-gray-900 ml-2">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duplicate Warning */}
                  {result.duplicateCheck?.isDuplicate && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <Copy className="h-4 w-4" />
                      <AlertDescription className="text-yellow-800">
                        <p className="font-medium mb-1">Potential duplicate detected</p>
                        <p className="text-sm">
                          This document appears similar to existing files. 
                          Similarity: {Math.round(result.duplicateCheck.confidence * 100)}%
                        </p>
                        {result.duplicateCheck.duplicates?.length > 0 && (
                          <ul className="text-sm mt-2 space-y-1">
                            {result.duplicateCheck.duplicates.slice(0, 3).map((dup, i) => (
                              <li key={i} className="flex items-center space-x-2">
                                <span>•</span>
                                <span>{dup.document.file_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(dup.similarity * 100)}% match
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* OCR Text Preview */}
                  {result.ocrResult?.text && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-700 flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span>Extracted Text</span>
                      </h5>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600 line-clamp-4">
                          {result.ocrResult.text.substring(0, 300)}
                          {result.ocrResult.text.length > 300 && '...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    {result.canUpload && !result.uploaded && !result.error && (
                      <button
                        onClick={() => uploadDocument(result)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload Document</span>
                      </button>
                    )}
                    
                    {!result.canUpload && !result.uploaded && (
                      <button
                        onClick={() => uploadDocument(result)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload Anyway</span>
                      </button>
                    )}

                    {result.uploaded && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Successfully uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartDocumentUpload;