import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import CategoryDetail from "@/pages/CategoryDetail";
import Products from "@/pages/Products";
import CategoryForm from "@/pages/CategoryForm";
import ProductForm from "@/pages/ProductForm";
import NotFound from "@/pages/NotFound";

// Routes are added as their pages are built; anything not listed yet falls
// through to NotFound rather than being stubbed out.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/new" element={<CategoryForm />} />
          <Route path="/categories/:id/edit" element={<CategoryForm />} />
          <Route path="/categories/:id" element={<CategoryDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
