import { motion, useDragControls } from "framer-motion";
import { useRef, useState } from "react";
import { Expand, Grip } from "lucide-react";
import { useOSStore } from "../store/useOSStore";

const controlClasses = {
  close: "bg-[#ff5f57]",
  minimize: "bg-[#ffbd2e]",
  focus: "bg-[#28c840]",
};

export function Window({ id, children }) {
  const dragControls = useDragControls();
  const windowData = useOSStore((state) => state.windows[id]);
  const focusedWindowId = useOSStore((state) => state.focusedWindowId);
  const focusWindow = useOSStore((state) => state.focusWindow);
  const closeWindow = useOSStore((state) => state.closeWindow);
  const minimizeWindow = useOSStore((state) => state.minimizeWindow);
  const updateWindowPosition = useOSStore((state) => state.updateWindowPosition);
  const updateWindowSize = useOSStore((state) => state.updateWindowSize);
  const resizeStartRef = useRef(null);
  const restoreBoundsRef = useRef(null);
  const [isMaximized, setIsMaximized] = useState(false);

  if (!windowData?.isOpen || windowData.isMinimized) {
    return null;
  }

  const isFocused = focusedWindowId === id;

  const toggleMaximize = (event) => {
    event.stopPropagation();
    focusWindow(id);

    if (isMaximized && restoreBoundsRef.current) {
      updateWindowPosition(id, restoreBoundsRef.current.position);
      updateWindowSize(id, restoreBoundsRef.current.size);
      restoreBoundsRef.current = null;
      setIsMaximized(false);
      return;
    }

    restoreBoundsRef.current = {
      position: windowData.position,
      size: windowData.size,
    };

    updateWindowPosition(id, { x: 0, y: 0 });
    updateWindowSize(id, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    setIsMaximized(true);
  };

  const enterNativeFullscreen = async (event) => {
    event.stopPropagation();
    focusWindow(id);

    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await document.documentElement.requestFullscreen?.();
    }
  };

  const beginDrag = (event) => {
    if (event.target.closest("button")) {
      return;
    }

    focusWindow(id);

    if (!isMaximized) {
      dragControls.start(event);
    }
  };

  const beginResize = (event) => {
    event.preventDefault();
    event.stopPropagation();
    focusWindow(id);

    resizeStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: windowData.size.width,
      height: windowData.size.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resize = (event) => {
    const start = resizeStartRef.current;

    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    updateWindowSize(id, {
      width: start.width + event.clientX - start.startX,
      height: start.height + event.clientY - start.startY,
    });
  };

  const endResize = () => {
    resizeStartRef.current = null;
  };

  return (
    <motion.section
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{
        opacity: isFocused ? 1 : 0.72,
        scale: 1,
        x: windowData.position.x,
        y: windowData.position.y,
        width: windowData.size.width,
        height: windowData.size.height,
      }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      onMouseDown={() => focusWindow(id)}
      onDragEnd={(_, info) => {
        if (isMaximized) {
          return;
        }

        updateWindowPosition(id, {
          x: windowData.position.x + info.offset.x,
          y: windowData.position.y + info.offset.y,
        });
      }}
      style={{ zIndex: windowData.zIndex }}
      className="absolute left-0 top-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/72 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
    >
      <header
        onPointerDown={beginDrag}
        className="flex h-11 select-none items-center justify-between border-b border-white/10 bg-white/[0.045] px-4"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Close ${windowData.title}`}
            onClick={(event) => {
              event.stopPropagation();
              closeWindow(id);
            }}
            className={`h-3 w-3 rounded-full ${controlClasses.close}`}
          />
          <button
            type="button"
            aria-label={`Minimize ${windowData.title}`}
            onClick={(event) => {
              event.stopPropagation();
              minimizeWindow(id);
            }}
            className={`h-3 w-3 rounded-full ${controlClasses.minimize}`}
          />
          <button
            type="button"
            aria-label={`${isMaximized ? "Restore" : "Maximize"} ${windowData.title}`}
            onClick={toggleMaximize}
            className={`h-3 w-3 rounded-full ${controlClasses.focus}`}
          />
        </div>
        <p className="text-sm font-medium text-slate-300">{windowData.title}</p>
        <div className="flex w-14 justify-end">
          <button
            type="button"
            title="Fullscreen"
            aria-label="Fullscreen"
            onClick={enterNativeFullscreen}
            className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
          >
            <Expand size={14} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      <div className="window-content h-[calc(100%-44px)] overflow-auto p-6">
        {children}
      </div>

      {!isMaximized && (
        <button
          type="button"
          aria-label={`Resize ${windowData.title}`}
          onPointerDown={beginResize}
          onPointerMove={resize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          className="absolute bottom-3 right-3 grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
        >
          <Grip size={14} strokeWidth={1.7} />
        </button>
      )}
    </motion.section>
  );
}
