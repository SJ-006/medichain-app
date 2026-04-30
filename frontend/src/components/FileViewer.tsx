import React from 'react';
import { X, FileText, Download, Eye, Receipt } from 'lucide-react';

interface FileViewerProps {
    fileName: string;
    fileType: 'PDF' | 'DICOM' | 'LAB';
    title: string;
    description: string;
    billFileName?: string;
    fileUrl?: string;
    onClose: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
    fileName,
    fileType,
    title,
    description,
    billFileName,
    fileUrl,
    onClose
}) => {
    // Simulate file preview
    const getFilePreview = () => {
        // If we have a real file URL, we can show it!
        if (fileUrl) {
            const isImage = fileUrl.startsWith('data:image/');
            const isPdf = fileUrl.startsWith('data:application/pdf');

            if (isImage) {
                return (
                    <div className="flex items-center justify-center h-full bg-slate-900 p-4">
                        <img src={fileUrl} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    </div>
                );
            }

            if (isPdf) {
                return (
                    <div className="w-full h-full">
                        <iframe src={fileUrl} className="w-full h-full border-0" title={title} />
                    </div>
                );
            }

            // Fallback for other data URLs
            return (
                <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-8">
                    <FileText size={64} className="text-slate-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 mb-6">{fileName}</p>
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
                        <p className="text-indigo-800 text-sm font-medium">Real file detected!</p>
                        <p className="text-indigo-600 text-xs mt-1">This file type is being handled as a secure blob.</p>
                    </div>
                </div>
            );
        }

        const fileExt = fileName.split('.').pop()?.toLowerCase();

        // For PDF files
        if (fileExt === 'pdf' || fileType === 'PDF') {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-8">
                    <FileText size={64} className="text-slate-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">PDF Document</h3>
                    <p className="text-sm text-slate-500 text-center max-w-md">{fileName}</p>
                    <div className="mt-6 bg-white rounded-lg p-6 border-2 border-slate-200 max-w-2xl w-full">
                        <h4 className="font-semibold text-slate-800 mb-3">Document Preview:</h4>
                        <div className="text-sm text-slate-600 space-y-2">
                            <p className="font-semibold">{title}</p>
                            <p className="text-xs text-slate-500">{description}</p>
                            <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200 font-mono text-xs">
                                <p>📄 {fileName}</p>
                                <p className="mt-2 text-slate-400">In a real application, the actual PDF content would be displayed here using a PDF viewer library.</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // For DICOM/Image files
        if (fileExt === 'dcm' || fileType === 'DICOM' || ['jpg', 'jpeg', 'png'].includes(fileExt || '')) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-8">
                    <div className="bg-slate-800 rounded-lg p-8 max-w-3xl w-full">
                        <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                            <Eye size={64} className="text-slate-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white mb-2">Medical Image / Scan</h3>
                            <p className="text-sm text-slate-400">{fileName}</p>
                            <div className="mt-4 text-xs text-slate-500">
                                <p>In a real application, DICOM images would be displayed using a medical imaging viewer.</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // For LAB reports
        if (fileType === 'LAB') {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full border border-blue-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <FileText size={32} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Laboratory Report</h3>
                                <p className="text-sm text-slate-500">{fileName}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">Test Name:</h4>
                                <p className="text-slate-600">{title}</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">Results:</h4>
                                <p className="text-sm text-slate-600">{description}</p>
                            </div>

                            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-500 italic">
                                    🔬 Detailed test results would appear here in a real application. This includes reference ranges, values, and interpretations.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Default fallback
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-8">
                <FileText size={64} className="text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
                <p className="text-sm text-slate-500">{fileName}</p>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Eye size={24} />
                        <div>
                            <h2 className="font-bold text-lg">File Viewer</h2>
                            <p className="text-sm text-slate-300">{fileType} Document</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {billFileName && (
                            <div className="flex items-center gap-2 bg-emerald-900/50 px-3 py-1.5 rounded text-sm">
                                <Receipt size={16} className="text-emerald-300" />
                                <span className="text-emerald-100">Bill: {billFileName}</span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            aria-label="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {getFilePreview()}
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-100 px-6 py-4 flex justify-between items-center border-t border-slate-200">
                    <div className="text-sm text-slate-600">
                        <span className="font-medium">File: </span>
                        <span className="font-mono">{fileName}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => alert('Download functionality would be implemented here with actual file storage.')}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors font-medium"
                        >
                            <Download size={18} />
                            Download
                        </button>
                        {billFileName && (
                            <button
                                onClick={() => alert(`Downloading bill: ${billFileName}`)}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                            >
                                <Receipt size={18} />
                                Download Bill
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
