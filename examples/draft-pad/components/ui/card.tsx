import { cn } from "@/lib/utils";
import * as React from "react";

// SVG Filter Component for Glass Distortion
function GlassDistortionFilter({ filterId }: { filterId: string }) {
  return (
    <svg className="absolute w-0 h-0" aria-hidden="true">
      <filter
        id={filterId}
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.01 0.01"
          numOctaves="1"
          seed="5"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="150"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

function Card({
  className,
  children,
  liquidGlass = true,
  ...props
}: React.ComponentProps<"div"> & { liquidGlass?: boolean }) {
  // Generate a stable unique filter ID for each Card instance using React's useId
  const reactId = React.useId();
  const filterId = liquidGlass ? `glass-distortion-${reactId}` : "";

  if (liquidGlass) {
    return (
      <>
        <GlassDistortionFilter filterId={filterId} />
        <div
          data-slot="card"
          className={cn(
            "relative rounded-3xl overflow-hidden shadow-[0_6px_6px_rgba(0,0,0,0.2),0_0_20px_rgba(0,0,0,0.1)] transition-all duration-400 ease-out hover:shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)]",
            className,
          )}
          {...props}
        >
          {/* Glass Effect Layer */}
          <div
            className="absolute inset-0 z-0 backdrop-blur-[3px] overflow-hidden rounded-3xl pointer-events-none"
            style={{ filter: `url(#${filterId})` }}
          />

          {/* Tint Layer - reducing opacity for more transparency */}
          <div className="absolute inset-0 z-[1] bg-white/10 overflow-hidden rounded-3xl pointer-events-none" />

          {/* Shine Layer - matching the example's box-shadow */}
          <div className="absolute inset-0 z-[2] overflow-hidden rounded-3xl shadow-[inset_2px_2px_1px_0_rgba(255,255,255,0.5),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)] pointer-events-none" />

          {/* Content Layer - now scrollable */}
          <div className="relative z-[3] overflow-auto max-h-full p-6">
            {children}
          </div>
        </div>
      </>
    );
  }

  // Fallback to original card style if liquidGlass is false
  return (
    <div
      data-slot="card"
      className={cn("text-card-foreground flex flex-col rounded-xl", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col space-y-1.5", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
