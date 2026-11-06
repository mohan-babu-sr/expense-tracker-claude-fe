/** Category as returned by the API (design §1, R5). */
export interface Category {
  id: string;
  name: string;
  /** Material icon name, e.g. `restaurant`. */
  icon: string;
  /** Hex color, e.g. `#E57373`. */
  color: string;
  isDefault: boolean;
  /** Only "Other" — cannot be deleted. */
  isSystem: boolean;
  /** Only present on GET /categories. */
  expenseCount?: number;
}

/** Body for POST/PUT /categories. */
export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
}
