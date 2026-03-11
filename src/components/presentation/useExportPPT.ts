// @ts-ignore - dynamic import
import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

export function useExportPPT(slides: { component: React.ComponentType; title: string }[]) {
  const [exporting, setExporting] = useState(false);

  const exportToPPT = useCallback(async () => {
    setExporting(true);
    try {
      const [{ default: pptxgen }, { default: html2canvas }] = await Promise.all([
        // @ts-ignore
        import('pptxgenjs'),
        import('html2canvas'),
      ]);

      const pptx = new pptxgen();
      pptx.defineLayout({ name: 'FULL_HD', width: 13.333, height: 7.5 });
      pptx.layout = 'FULL_HD';

      // Create offscreen container — visible but behind viewport so CSS renders correctly
      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;left:0;top:0;width:1920px;height:1080px;overflow:hidden;z-index:99999;opacity:0;pointer-events:none;';
      document.body.appendChild(container);

      // Copy stylesheets into container context
      const styleSheets = Array.from(document.styleSheets);
      const styleEl = document.createElement('style');
      let cssText = '';
      for (const sheet of styleSheets) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            cssText += rule.cssText + '\n';
          }
        } catch (_) {
          // cross-origin sheets — skip
        }
      }
      container.appendChild(styleEl);
      styleEl.textContent = cssText;

      for (let i = 0; i < slides.length; i++) {
        const slideDiv = document.createElement('div');
        slideDiv.style.cssText = 'width:1920px;height:1080px;position:relative;';
        container.innerHTML = '';
        container.appendChild(styleEl);
        container.appendChild(slideDiv);

        const root = createRoot(slideDiv);
        root.render(createElement(slides[i].component));

        // Wait longer for fonts + flex layout to settle
        await new Promise(r => setTimeout(r, 600));

        const canvas = await html2canvas(slideDiv, {
          width: 1920,
          height: 1080,
          scale: 1,
          useCORS: true,
          backgroundColor: '#0d1b2a',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.querySelector('[style*="1920px"]') as HTMLElement;
            if (clonedEl) {
              clonedEl.style.width = '1920px';
              clonedEl.style.height = '1080px';
              clonedEl.style.position = 'relative';
              clonedEl.style.overflow = 'hidden';
            }
          },
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
