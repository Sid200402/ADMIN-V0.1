export interface LabelDimensions {
  width: string;
  height: string;
  name: string;
}

export interface PageSize {
  width: number;
  name: string;
}

export class LabelPrinter {
  static readonly PAGE_SIZES: PageSize[] = [
    { width: 210, name: 'A4 Width (210mm)' },
    { width: 216, name: 'Letter Width (216mm)' },
    { width: 210, name: 'A4 Portrait Width (210mm)' },
    { width: 297, name: 'A4 Landscape Width (297mm)' },
    { width: 279, name: 'Letter Landscape Width (279mm)' }
  ];
  static readonly LABEL_SIZES: LabelDimensions[] = [
    { width: '51mm', height: '25mm', name: 'Standard (51mm x 25mm)' },
    { width: '57mm', height: '32mm', name: 'Medium (57mm x 32mm)' },
    { width: '102mm', height: '51mm', name: 'Large (102mm x 51mm)' },
    { width: '76mm', height: '38mm', name: 'Wide (76mm x 38mm)' },
    { width: '64mm', height: '25mm', name: 'Narrow (64mm x 25mm)' }
  ];

  /**
   * Print barcode to label printer using browser's print API
   * @param barcodeImageUrl - Base64 or blob URL of the barcode image
   * @param dimensions - Label dimensions (optional, defaults to standard)
   * @param columns - Number of columns (1 or 2)
   * @param quantity - Number of labels to print
   */
  static async printToLabelPrinter(
    barcodeImageUrl: string, 
    dimensions?: LabelDimensions,
    columns: number = 1,
    quantity: number = 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const printWindow = window.open('', '_blank', 'width=400,height=300');
        
        if (!printWindow) {
          reject(new Error('Failed to open print window'));
          return;
        }

        // Generate all labels on single page
        let pagesHtml = '<div class="page">';
        
        for (let i = 0; i < quantity; i++) {
          pagesHtml += `<div class="label"><img src="${barcodeImageUrl}" alt="Barcode" /></div>`;
        }
        
        pagesHtml += '</div>';

        // Create optimized HTML for label printer
        const labelHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Label Print</title>
              <style>
                @page {
                  size: ${columns === 2 ? '102mm 25mm' : dimensions?.width || '51mm'} ${columns === 2 ? '' : dimensions?.height || '25mm'};
                  margin: 0;
                }
                * {
                  box-sizing: border-box;
                }
                html, body {
                  margin: 0;
                  padding: 0;
                  width: 100%;
                  height: 100%;
                  font-family: Arial, sans-serif;
                  overflow: hidden;
                }
                .page {
                  display: flex;
                  flex-wrap: wrap;
                  width: ${columns === 2 ? '102mm' : '51mm'};
                  min-height: 25mm;
                  position: relative;
                }
                .label {
                  width: 51mm;
                  height: 25mm;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  ${columns === 2 ? 'flex: 0 0 50%;' : 'flex: 0 0 100%;'}
                }
                img {
                  ${columns === 2 ? 'width: 46mm !important; height: 20mm !important;' : 'width: 46mm !important; height: 20mm !important;'}
                  object-fit: contain !important;
                  display: block !important;
                  max-width: none !important;
                  max-height: none !important;
                }
                @media print {
                  html, body {
                    width: 100% !important;
                    height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .page {
                    width: ${columns === 2 ? '102mm' : '51mm'} !important;
                    min-height: ${Math.ceil(quantity / columns) * 25}mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .label {
                    width: 51mm !important;
                    height: 25mm !important;
                  }
                  img {
                    width: 46mm !important;
                    height: 20mm !important;
                    object-fit: contain !important;
                  }
                  body { -webkit-print-color-adjust: exact !important; }
                }
              </style>
            </head>
            <body>
              ${pagesHtml}
              <script>
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => window.close(), 1000);
                  }, 500);
                };
              </script>
            </body>
          </html>
        `;

        printWindow.document.write(labelHtml);
        printWindow.document.close();
        
        // Resolve after print dialog is triggered
        setTimeout(() => resolve(), 1000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  static async convertResponseToImageUrl(response: any): Promise<string> {
    try {
      let imageData: Uint8Array;
      
      if (response.data) {
        // Handle different response formats
        if (response.data.data) {
          imageData = new Uint8Array(response.data.data);
        } else if (Array.isArray(response.data)) {
          imageData = new Uint8Array(response.data);
        } else {
          imageData = new Uint8Array(response.data);
        }
      } else {
        imageData = new Uint8Array(response);
      }

      const blob = new Blob([imageData], { type: 'image/png' });
      return URL.createObjectURL(blob);
    } catch (error) {
      throw new Error('Failed to convert response to image URL');
    }
  }
}