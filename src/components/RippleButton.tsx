import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

interface RippleButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

function getContrastColor(color: string): "light" | "dark" {
  const match = color.match(/\d+/g);

  if (!match || match.length < 3) {
    return "light";
  }

  const [r, g, b] = match.map(Number);

  const luminance =
    0.299 * r +
    0.587 * g +
    0.114 * b;

  return luminance > 186 ? "dark" : "light";
}

export default function RippleButton({
  children,
  className = "",
  onClick,
  disabled,
  ...props
}: RippleButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [ripples, setRipples] = useState<Ripple[]>([]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (disabled) return;

    const button = buttonRef.current;

    if (!button) return;

    const rect = button.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height) * 2;

    const x =
      event.clientX -
      rect.left -
      size / 2;

    const y =
      event.clientY -
      rect.top -
      size / 2;

    const backgroundColor =
      getComputedStyle(button).backgroundColor;

    const contrast =
      getContrastColor(backgroundColor);

    const ripple: Ripple = {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
      color:
        contrast === "light"
          ? "rgba(255, 255, 255, 0.25)"
          : "rgba(0, 0, 0, 0.15)",
    };

    setRipples((current) => [
      ...current,
      ripple,
    ]);

    setTimeout(() => {
      setRipples((current) =>
        current.filter(
          (item) => item.id !== ripple.id
        )
      );
    }, 600);

    onClick?.(event);
  }

  return (
    <button
      ref={buttonRef}
      {...props}
      disabled={disabled}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}

      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            width: ripple.size,
            height: ripple.size,
            left: ripple.x,
            top: ripple.y,
            backgroundColor: ripple.color,
            animation:
              "ripple 600ms ease-out forwards",
          }}
        />
      ))}
    </button>
  );
}