
import React, { useState, useEffect } from 'react';

interface TypeWriterProps {
  text: string;
  delay?: number;
}

export const TypeWriter: React.FC<TypeWriterProps> = ({ 
  text, 
  delay = 1200 
}) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay / text.length);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, delay]);

  return <span>{currentText}</span>;
};
