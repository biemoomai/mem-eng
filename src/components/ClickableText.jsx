import React from 'react';

const ClickableText = ({ text, style }) => {
  if (!text) return null;
  return <span style={style}>{text}</span>;
};

export default ClickableText;
