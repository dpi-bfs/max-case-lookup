export function flattenElements(elements: any[]): any[] {
  return elements.flatMap(el =>
    el.type === "section" && Array.isArray(el.elements)
      ? flattenElements(el.elements)
      : [el]
  );
}

