import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

export function useExportPPT(slides: { component: React.ComponentType; title: string }[]) {
  const [exporting, setExporting] = useState(false);

  const exportToPPT = useCallback(async () => {
    setExporting(true);
    try {
      const [{ default: pptxgen }, { default: html2canvas }] = await Promise.all([
        import('pptxgenjs'),
        import('html2canvas'),
      ]);

      const pptx = new pptxgen();
      pptx.defineLayout({ name: 'FULL_HD', width: 13.333, height: 7.5 });
      pptx.layout = 'FULL_HD';

      // Create offscreen container
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1920px;height:1080px;overflow:hidden;z-index:-1;';
      document.body.appendChild(container);

      for (let i = 0; i < slides.length; i++) {
        const slideDiv = document.createElement('div');
        slideDiv.style.cssText = 'width:1920px;height:1080px;';
        container.innerHTML = '';
        container.appendChild(slideDiv);

        const root = createRoot(slideDiv);
        root.render(createElement(slides[i].component));

        // Wait for render
        await new Promise(r => setTimeout(r, 300));

        const canvas = await html2canvas(slideDiv, {
          width: 1920,
          height: 1080,
          scale: 1,
          useCORS: true,
          backgroundColor: '#0d1b2a',
        });

        root.unmount();

        const imgData = canvas.toDataURL('image/png');
        const pptSlide = pptx.addSlide();
        pptSlide.background = { color: '0d1b2a' };
        pptSlide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
      }

      document.body.removeChild(container);
      await pptx.writeFile({ fileName: 'FutNet-Pro-Apresentacao.pptx' });
    } catch (err) {
      console.error('Erro ao exportar PPT:', err);
    } finally {
      setExporting(false);
    }
  }, [slides]);

  return { exportToPPT, exporting };
}
