import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFOptions {
  title: string;
  content: string;
  author?: string;
  createdAt?: string;
  margin?: number;
}

export class PDFService {
  /**
   * Generate PDF from HTML content
   */
  static async generatePDF(options: PDFOptions): Promise<void> {
    const { title, content, author, createdAt, margin = 20 } = options;
    
    try {
      // Create a temporary container for the content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.padding = `${margin}px`;
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '12px';
      tempContainer.style.lineHeight = '1.6';
      tempContainer.style.color = '#333';
      tempContainer.style.backgroundColor = '#fff';
      
      // Create PDF content structure
      const pdfContent = `
        <div style="margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
          <h1 style="font-size: 24px; margin: 0 0 10px 0; color: #333;">${title}</h1>
          ${author ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Author:</strong> ${author}</p>` : ''}
          ${createdAt ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Created:</strong> ${new Date(createdAt).toLocaleDateString()}</p>` : ''}
          <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <div style="word-wrap: break-word;">
          ${content}
        </div>
      `;
      
      tempContainer.innerHTML = pdfContent;
      document.body.appendChild(tempContainer);
      
      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight
      });
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210 - (margin * 2); // A4 width minus margins
      const pageHeight = 297 - (margin * 2); // A4 height minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Download the PDF
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }
  
  /**
   * Generate PDF from note data with better formatting
   */
  static async generateNotesPDF(options: PDFOptions): Promise<void> {
    const { title, content, author, createdAt } = options;
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let currentY = margin;
      
      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(title, contentWidth);
      pdf.text(titleLines, margin, currentY);
      currentY += titleLines.length * 10 + 10;
      
      // Add metadata
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      
      if (author) {
        pdf.text(`Author: ${author}`, margin, currentY);
        currentY += 6;
      }
      
      if (createdAt) {
        pdf.text(`Created: ${new Date(createdAt).toLocaleDateString()}`, margin, currentY);
        currentY += 6;
      }
      
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, currentY);
      currentY += 15;
      
      // Add separator line
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 15;
      
      // Add content
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      // Strip HTML tags and format content
      const plainContent = this.stripHtmlTags(content);
      const contentLines = pdf.splitTextToSize(plainContent, contentWidth);
      
      for (let i = 0; i < contentLines.length; i++) {
        if (currentY + 7 > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.text(contentLines[i], margin, currentY);
        currentY += 7;
      }
      
      // Download the PDF
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }
  
  /**
   * Strip HTML tags from content
   */
  private static stripHtmlTags(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace common HTML elements with appropriate formatting
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Add line breaks for paragraphs
    text = text.replace(/\. /g, '.\n\n');
    
    return text;
  }
  
  /**
   * Generate PDF with rich formatting preserved
   */
  static async generateRichFormatPDF(options: PDFOptions): Promise<void> {
    const { title, content, author, createdAt } = options;
    
    try {
      // Create a styled container
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 794px;
        min-height: 1123px;
        padding: 60px;
        font-family: 'Times New Roman', serif;
        font-size: 14px;
        line-height: 1.6;
        color: #000;
        background: #fff;
        box-sizing: border-box;
      `;
      
      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        margin-bottom: 40px;
        border-bottom: 2px solid #000;
        padding-bottom: 20px;
      `;
      
      const titleElement = document.createElement('h1');
      titleElement.style.cssText = `
        font-size: 28px;
        margin: 0 0 15px 0;
        font-weight: bold;
        text-align: center;
      `;
      titleElement.textContent = title;
      header.appendChild(titleElement);
      
      if (author || createdAt) {
        const metaDiv = document.createElement('div');
        metaDiv.style.cssText = `
          font-size: 12px;
          color: #666;
          text-align: center;
          margin-top: 10px;
        `;
        
        const metaInfo = [];
        if (author) metaInfo.push(`Author: ${author}`);
        if (createdAt) metaInfo.push(`Created: ${new Date(createdAt).toLocaleDateString()}`);
        metaInfo.push(`Generated: ${new Date().toLocaleDateString()}`);
        
        metaDiv.innerHTML = metaInfo.join(' | ');
        header.appendChild(metaDiv);
      }
      
      container.appendChild(header);
      
      // Content
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = content;
      
      // Style the content for better PDF rendering
      const elements = contentDiv.querySelectorAll('*');
      elements.forEach(el => {
        const element = el as HTMLElement;
        if (element.tagName === 'P') {
          element.style.marginBottom = '12px';
        } else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
          element.style.marginTop = '20px';
          element.style.marginBottom = '10px';
          element.style.fontWeight = 'bold';
        } else if (element.tagName === 'UL' || element.tagName === 'OL') {
          element.style.marginLeft = '20px';
          element.style.marginBottom = '12px';
        }
      });
      
      container.appendChild(contentDiv);
      document.body.appendChild(container);
      
      // Generate PDF using html2canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(container);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating rich format PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }
}

export default PDFService;