# Mathematics — Unit 1: Differential Calculus

## Overview
Differential calculus studies **rates of change and slopes of curves** using derivatives. It is one of the two branches of calculus (the other being integral calculus).

---

## 1. Limits

The **limit** of a function f(x) as x approaches a value 'a':

```
lim[x→a] f(x) = L
```

### Standard Limits

| Limit | Result |
|-------|--------|
| lim[x→0] sin(x)/x | 1 |
| lim[x→0] (1+x)^(1/x) | e |
| lim[x→∞] (1 + 1/n)^n | e |
| lim[x→0] (aˣ - 1)/x | ln a |
| lim[x→0] (eˣ - 1)/x | 1 |

**L'Hôpital's Rule** (for 0/0 or ∞/∞ forms):
```
lim[x→a] f(x)/g(x) = lim[x→a] f'(x)/g'(x)
```

---

## 2. Continuity

A function f(x) is **continuous** at x = a if:
1. f(a) is defined
2. lim[x→a] f(x) exists
3. lim[x→a] f(x) = f(a)

---

## 3. Derivatives

The derivative measures the **rate of change** of a function.

```
f'(x) = lim[h→0] [f(x+h) - f(x)] / h
```

### Standard Derivatives

| f(x) | f'(x) |
|------|-------|
| xⁿ | nxⁿ⁻¹ |
| eˣ | eˣ |
| aˣ | aˣ ln a |
| ln x | 1/x |
| sin x | cos x |
| cos x | -sin x |
| tan x | sec² x |
| sin⁻¹ x | 1/√(1-x²) |
| tan⁻¹ x | 1/(1+x²) |

---

## 4. Rules of Differentiation

**Product Rule:**
```
d/dx [u·v] = u·v' + v·u'
```

**Quotient Rule:**
```
d/dx [u/v] = (v·u' - u·v') / v²
```

**Chain Rule:**
```
d/dx [f(g(x))] = f'(g(x)) · g'(x)
```

---

## 5. Applications of Derivatives

### Maxima and Minima
- **Critical points:** f'(x) = 0 or f'(x) undefined
- **Maximum:** f'(x) changes from + to – (f''(x) < 0)
- **Minimum:** f'(x) changes from – to + (f''(x) > 0)
- **Point of inflection:** f''(x) = 0

### Increasing / Decreasing Functions
- f'(x) > 0 → f is increasing
- f'(x) < 0 → f is decreasing

### Tangent and Normal
```
Slope of tangent at (x₁,y₁) = f'(x₁)
Slope of normal = -1/f'(x₁)
```

---

## Practice Questions

1. Evaluate: lim[x→0] (sin 3x)/(5x)
2. Find dy/dx if y = x³ + 2x² – 5x + 1
3. Differentiate: y = eˣ · sin x using product rule
4. Find the maximum and minimum values of f(x) = x³ – 3x + 2
5. Find the equation of tangent to y = x² at point (2, 4)
