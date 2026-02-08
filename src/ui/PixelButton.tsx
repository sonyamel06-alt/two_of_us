import { useState } from 'react';

type PixelButtonProps = {
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  shadowY?: number;
  shadowColor?: string;
  pressOffset?: number;
  pressScale?: number;
};

export function PixelButton({
  onClick,
  children,
  style,
  className,
  disabled,
  shadowY,
  shadowColor,
  pressOffset = 2,
  pressScale = 0.98,
}: PixelButtonProps) {
  const [pressed, setPressed] = useState(false);
  const y = shadowY ?? 0;
  const pressedY = Math.max(0, y - 2);

  const baseTransform = style?.transform ? String(style.transform) : '';
  const pressedTransform = pressed ? ` translateY(${pressOffset}px) scale(${pressScale})` : '';
  const transform = `${baseTransform}${pressedTransform}`.trim() || undefined;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        ...style,
        transform,
        boxShadow:
          shadowColor != null
            ? `0 ${pressed ? pressedY : y}px 0 ${shadowColor}`
            : style?.boxShadow,
        transition: 'transform 100ms ease, box-shadow 100ms ease',
        cursor: disabled ? 'default' : 'pointer',
        outline: 'none',
      }}
    >
      {children}
    </button>
  );
}
