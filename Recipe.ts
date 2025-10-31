interface IngredientGroup {
  ingredients: Array<string>;
  purpose: string;
}

export default interface Recipe {
  // kept snake_case since the parsed recipe has snake_case
  author: string;
  canonical_url: string;
  category: string;
  cook_time: number;
  cuisine: string;
  description: string;
  host: string;
  image: string;
  ingredient_groups: Array<IngredientGroup>;
  ingredients: Array<string>;
  instructions: string;
  instructions_list: Array<string>;
  language: string;
  nutrients: any;
  prep_time: number;
  ratings: number;
  ratings_count: number;
  site_name: string;
  title: string;
  total_time: number;
  yields: string;
}
