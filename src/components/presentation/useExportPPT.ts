import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { toPng } from 'html-to-image';

export function useExportPPT(slides: { component: React.ComponentType; title: string }[]) {
  const [exporting, setExporting] = useState(false);

  const exportToPPT = useCallback(async () => {
    setExporting(true);
    try {
      // @ts-ignore
      const { default: pptxgen } = await import('pptxgenjs');

      const pptx = new pptxgen();
      pptx.defineLayout({ name: 'FULL_HD', width: 13.333, height: 7.5 });
      pptx.layout = 'FULL_HD';

      // Container visible but transparent so CSS layout works correctly
      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;left:0;top:0;width:1920px;height:1080px;overflow:hidden;z-index:99999;opacity:0;pointer-events:none;';
      document.body.appendChild(container);

      for (let i = 0; i < slides.length; i++) {
        const slideDiv = document.createElement('div');
        slideDiv.style.cssText = 'width:1920px;height:1080px;position:relative;';
        container.innerHTML = '';
        container.appendChild(slideDiv);

        const root = createRoot(slideDiv);
        root.render(createElement(slides[i].component));

        // Wait for fonts + layout to settle
        await new Promise(r => setTimeout(r, 800));

        const imgData = await toPng(slideDiv, {
          width: 1920,
          height: 1080,
          pixelRatio: 1,
          backgroundColor: '#0d1b2a',
        });

        root.unmount();

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
