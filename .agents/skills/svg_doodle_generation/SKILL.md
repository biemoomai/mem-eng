---
name: svg-doodle-generation
description: Guidelines for generating clear, high-quality, and dynamically animated educational SVG doodles for English vocabulary words.
---

# SVG Doodle Generation Skill Guidelines

This document outlines the design principles, stick figure coordinate templates, and prompt engineering rules for generating clear, high-quality, and dynamically animated educational SVG doodles for vocabulary words.

---

## ❌ Banned Abstract Diagrams
Instead of drawing abstract diagrams like flowcharts, concept maps, or circles connected by lines labeled "Me" or "Accountant", the generator must draw concrete situational scenes of stick figures performing the action or illustrating the noun.

---

## 🎨 Layout Composition & Coordinate Templates

All drawings are designed in a **500x800** coordinate space. The title word is positioned at the top (`y=80`).

### 1. Layout A: The Desk Scene (Work / Study / Office)
* **Desk Surface:**
  ```xml
  <rect x="100" y="480" width="300" height="15" rx="3" stroke="#000000" stroke-width="3" fill="#ffffff" />
  ```
* **Sitting Figure Head:**
  ```xml
  <circle cx="160" cy="360" r="22" stroke="#000000" stroke-width="3" fill="#ffffff" />
  ```
* **Sitting Figure Body:**
  ```xml
  <line x1="160" y1="382" x2="160" y2="470" stroke="#000000" stroke-width="3" />
  ```
* **Sitting Figure Thigh:**
  ```xml
  <line x1="160" y1="470" x2="200" y2="470" stroke="#000000" stroke-width="3" />
  ```
* **Sitting Figure Shin:**
  ```xml
  <line x1="200" y1="470" x2="200" y2="540" stroke="#000000" stroke-width="3" />
  ```

### 2. Layout B: The Dual Person Scene (Dialogue / Interaction / Relation)
* **Left Figure (x=150):** Head at `cy=320`, Torso to `y=420`, Legs to `y=500`.
* **Right Figure (x=350):** Head at `cy=320`, Torso to `y=420`, Legs to `y=500`.
* **Middle elements:** Speech bubble or action arrows in the space between `x=200` and `x=300`.

### 3. Layout C: The Solo Action Scene (Activity / State / Adjective)
* **Centered Figure (x=250):** Head at `cy=300`, Torso to `y=400`, Legs to `y=480`.
* **Action elements:** Dynamic visual trails, speed lines, rain clouds, or piles of objects surrounding the character.

---

## ⚡ CSS Keyframe Animations
Every SVG generated must embed a `<style>` block defining keyframe animations and standard animation classes:
```xml
<style>
  @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes stress { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(-2px, 1px); } 40% { transform: translate(1px, -1px); } 60% { transform: translate(-1px, -1px); } 80% { transform: translate(2px, 1px); } }
  @keyframes pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.3; } }
  .wiggle { animation: wiggle 0.6s ease-in-out infinite; transform-origin: 250px 400px; }
  .bounce { animation: bounce 0.8s ease-in-out infinite; }
  .stress { animation: stress 0.15s ease-in-out infinite; }
  .pulse { animation: pulse 1s ease-in-out infinite; }
</style>
```

Wrap animated elements inside `<g class="wiggle">`, `<g class="bounce">`, `<g class="stress">`, or `<g class="pulse">`. If wiggling a group, ensure `transform-origin` is set to match the center coordinates of the wiggling element.
