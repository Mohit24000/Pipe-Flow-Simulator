import React, { useState, useRef, useEffect } from 'react';

const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'New Model', shortcut: 'Ctrl+N', action: 'new' },
      { label: 'Open...', shortcut: 'Ctrl+O', action: 'open', disabled: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: 'save', disabled: true },
      { sep: true },
      { label: 'Export PDF Report', action: 'export' },
      { sep: true },
      { label: 'Exit', action: 'exit', disabled: true },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo', disabled: true },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo', disabled: true },
      { sep: true },
      { label: 'Select All', shortcut: 'Ctrl+A', action: 'selectAll', disabled: true },
      { label: 'Delete Selected', shortcut: 'Del', action: 'delete' },
      { sep: true },
      { label: 'Clear Canvas', action: 'clear' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Fit to View', shortcut: 'F', action: 'fitView' },
      { label: 'Reset Zoom', action: 'resetZoom' },
      { sep: true },
      { label: 'Show Grid', action: 'grid' },
      { label: 'Show MiniMap', action: 'minimap' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Fluid Properties...', action: 'fluid' },
      { label: 'Pipe Materials...', action: 'materials', disabled: true },
      { sep: true },
      { label: 'Simulation Options...', action: 'simOptions', disabled: true },
    ],
  },
  {
    label: 'Simulation',
    items: [
      { label: 'Run Simulation', shortcut: 'F5', action: 'simulate' },
      { label: 'Stop', action: 'stop', disabled: true },
      { sep: true },
      { label: 'View Results', action: 'results' },
      { label: 'Clear Results', action: 'clearResults' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Formula Reference', action: 'formulas', disabled: true },
      { sep: true },
      { label: 'About Pipe Flow Simulator v1.1', action: 'about', disabled: true },
    ],
  },
];

export default function MenuBar({ onAction }) {
  const [openMenu, setOpenMenu] = useState(null);
  const barRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleItemClick = (item) => {
    if (item.disabled || item.sep) return;
    setOpenMenu(null);
    onAction && onAction(item.action);
  };

  return (
    <div className="menu-bar" ref={barRef}>
      {MENUS.map((menu) => (
        <div
          key={menu.label}
          className={`menu-item${openMenu === menu.label ? ' open' : ''}`}
          onMouseDown={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
          onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
        >
          {menu.label}
          {openMenu === menu.label && (
            <div className="menu-dropdown" onMouseDown={(e) => e.stopPropagation()}>
              {menu.items.map((item, i) =>
                item.sep ? (
                  <div key={i} className="menu-dropdown-sep" />
                ) : (
                  <div
                    key={i}
                    className={`menu-dropdown-item${item.disabled ? ' disabled' : ''}`}
                    onMouseDown={() => handleItemClick(item)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
