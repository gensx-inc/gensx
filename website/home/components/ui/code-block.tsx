import { FC, useEffect, useMemo, useState } from 'react';
import { getHighlighter } from 'shiki';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: FC<CodeBlockProps> = ({
  code,
  language = 'jsx',
}) => {
  const [highlightedCode, setHighlightedCode] = useState('');
  
  const memoizedHighlighter = useMemo(() => {
    return getHighlighter({
      themes: ['github-light'],
      langs: ['typescript', 'jsx'],
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const highlight = async () => {
      const highlighter = await memoizedHighlighter;
      if (!mounted) return;
      
      const html = highlighter.codeToHtml(code, {
        lang: language,
        theme: 'github-light'
      });
      setHighlightedCode(html);
    };
    
    highlight();
    return () => { mounted = false; };
  }, [code, language, memoizedHighlighter]);

  return (
    <div className="rounded-[2px] border bg-white shadow-sm flex flex-col relative group overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent opacity-0 transition-opacity pointer-events-none" />
      <div 
        className="p-6 text-sm overflow-y-auto flex-1 bg-white/80 [&_pre]:!bg-transparent [&_pre]:!m-0"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </div>
  );
}; 
