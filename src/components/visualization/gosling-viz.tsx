"use client";

import { GoslingComponent } from "gosling.js";
import { ComponentProps } from "react";

export default function GoslingViz(
  props: ComponentProps<typeof GoslingComponent>,
) {
  return <GoslingComponent {...props} />;
}
