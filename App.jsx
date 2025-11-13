import React, { useState } from 'react';
import { Upload, Download, Trash2, AlertCircle } from 'lucide-react';

export default function App() {
  const [images, setImages] = useState([]);
  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState(null);

  // Backend URL
  const BACKEND_URL = 'https://kleurboek-backend.onrender.com';

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 10) {
      alert('Je kunt maximaal 10 foto\'s uploaden!');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          original: event.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setProcessedImages(prev => prev.filter(img => img.id !== id));
  };

  const processImages = async () => {
    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);
    const processed = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/generate-coloring-page`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: images[i].original
          })
        });

        if (!response.ok) {
          throw new Error(`Fout bij afbeelding ${i + 1}`);
        }

        const data = await response.json();

        const imageResponse = await fetch(data.imageUrl);
        const blob = await imageResponse.blob();
        const imageUrl = URL.createObjectURL(blob);

        processed.push({
          id: images[i].id,
          data: imageUrl,
          name: images[i].name
        });

        setProcessingProgress(Math.round(((i + 1) / images.length) * 100));

      } catch (err) {
        console.error('Error processing image:', err);
        setError(`Fout bij het verwerken van afbeelding ${i + 1}: ${err.message}`);
        setIsProcessing(false);
        return;
      }
    }

    setProcessedImages(processed);
    setIsProcessing(false);
    setProcessingProgress(100);
  };

  const generatePDF = async () => {
    if (processedImages.length === 0) return;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);

    await new Promise((resolve) => {
      script.onload = resolve;
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;

    for (let i = 0; i < processedImages.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve) => {
        img.onload = () => {
          const maxWidth = pageWidth - (margin * 2);
          const maxHeight = pageHeight - (margin * 2);
          
          const imgRatio = img.width / img.height;
          const pageRatio = maxWidth / maxHeight;
          
          let finalWidth, finalHeight;
          
          if (imgRatio > pageRatio) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / imgRatio;
          } else {
            finalHeight = maxHeight;
            finalWidth = maxHeight * imgRatio;
          }
          
          const x = (pageWidth - finalWidth) / 2;
          const y = (pageHeight - finalHeight) / 2;
          
          pdf.addImage(img, 'PNG', x, y, finalWidth, finalHeight);
          resolve();
        };
        img.src = processedImages[i].data;
      });
    }

    pdf.save('mijn-kleurboek.pdf');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="mx-auto" style={{maxWidth: '800px'}}>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-purple-900 mb-4">
            🎨 AI Kleurboek Generator
          </h1>
          <p className="text-lg text-gray-700">
            Upload maximaal 10 foto's en maak je eigen kleurboek met OpenAI!
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Fout:</strong> {error}
              <p className="text-sm mt-1">Controleer of je backend server draait op {BACKEND_URL}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <label className="flex flex-col items-center justify-center border-4 border-dashed border-purple-300 rounded-xl p-12 cursor-pointer hover:border-purple-500 transition-colors">
            <Upload className="w-16 h-16 text-purple-500 mb-4" />
            <span className="text-xl font-semibold text-gray-700 mb-2">
              Klik om foto's te uploaden
            </span>
            <span className="text-sm text-gray-500">
              {images.length}/10 foto's geselecteerd
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={images.length >= 10}
            />
          </label>
        </div>

        {images.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Jouw foto's ({images.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.original}
                    alt={img.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={processImages}
              disabled={isProcessing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? `⏳ Bezig met verwerken... ${processingProgress}%` : '✨ Maak Kleurplaten met AI'}
            </button>
            
            {isProcessing && (
              <div className="mt-4 bg-purple-100 rounded-lg p-4">
                <div className="w-full bg-purple-200 rounded-full h-3">
                  <div 
                    className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Dit kan 1-2 minuten per afbeelding duren...
                </p>
              </div>
            )}
          </div>
        )}

        {processedImages.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Jouw Kleurboek Preview
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              {processedImages.map((img) => (
                <div key={img.id} className="border-2 border-gray-200 rounded-lg p-4">
                  <img
                    src={img.data}
                    alt={img.name}
                    className="w-full rounded"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={generatePDF}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-6 h-6" />
              Download als PDF (A4 formaat)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}