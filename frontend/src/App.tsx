import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Item = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  description: string | null;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
};

type CategoryItemsResponse = {
  category: Category;
  items: Item[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) {
        message = data.message.join(', ');
      } else if (data.message) {
        message = data.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryItems, setCategoryItems] = useState<Record<string, Item[]>>({});
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [activeCategoryData, setActiveCategoryData] = useState<CategoryItemsResponse | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  const canManage = adminKey.trim().length > 0;

  async function loadHomeData() {
    setIsLoading(true);
    setStatus('');
    try {
      const categoryList = await apiFetch<Category[]>('/categories');
      setCategories(categoryList);

      const results = await Promise.all(
        categoryList.map(async (category) => {
          const data = await apiFetch<CategoryItemsResponse>(`/categories/${category.slug}/items`);
          return [category.slug, data.items] as const;
        }),
      );

      setCategoryItems(Object.fromEntries(results));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCategory(slug: string) {
    setIsLoading(true);
    setStatus('');
    try {
      const data = await apiFetch<CategoryItemsResponse>(`/categories/${slug}/items`);
      setActiveCategoryData(data);
      setActiveCategorySlug(slug);
      setSelectedItem(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load category');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHomeData();
  }, []);

  const visibleCategories = useMemo(
    () => categories.map((category) => ({ category, items: categoryItems[category.slug] ?? [] })),
    [categories, categoryItems],
  );

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCategoryData) return;

    setStatus('');
    try {
      await apiFetch<Item>('/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          title: newItemTitle,
          categoryId: activeCategoryData.category.id,
          imageUrl: newItemImageUrl,
          description: newItemDescription,
        }),
      });

      setNewItemTitle('');
      setNewItemImageUrl('');
      setNewItemDescription('');
      await loadCategory(activeCategoryData.category.slug);
      setStatus('Item creado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error creating item');
    }
  }

  async function handleDeleteItem(id: string) {
    setStatus('');
    try {
      await apiFetch<{ success: boolean }>(`/items/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });

      setSelectedItem(null);
      if (activeCategoryData) {
        await loadCategory(activeCategoryData.category.slug);
      } else {
        await loadHomeData();
      }
      setStatus('Item eliminado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error deleting item');
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Catalogo Personal</h1>
        <div className="adminBox">
          <label htmlFor="admin-key">Admin key</label>
          <input
            id="admin-key"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="x-admin-key"
          />
        </div>
      </header>

      {status && <p className="status">{status}</p>}

      {activeCategorySlug === null ? (
        <main className="homeGrid">
          {isLoading && <p>Cargando...</p>}
          {!isLoading &&
            visibleCategories.map(({ category, items }) => (
              <section key={category.id} className="categorySection">
                <div className="categoryHeader">
                  <h2>{category.name}</h2>
                  <button onClick={() => void loadCategory(category.slug)}>Ver categoria</button>
                </div>

                <div className="itemRow">
                  {items.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      className="itemCard"
                      onClick={() => setSelectedItem(item)}
                      type="button"
                    >
                      <img src={item.imageUrl} alt={item.title} />
                      <strong>{item.title}</strong>
                    </button>
                  ))}
                  {items.length === 0 && <p className="empty">Sin items todavia.</p>}
                </div>
              </section>
            ))}
        </main>
      ) : (
        <main className="categoryPage">
          <div className="categoryToolbar">
            <button
              className="backButton"
              onClick={() => {
                setActiveCategorySlug(null);
                setActiveCategoryData(null);
                setSelectedItem(null);
              }}
            >
              Volver al inicio
            </button>
            <h2>{activeCategoryData?.category.name}</h2>
          </div>

          {canManage && (
            <form className="createForm" onSubmit={(event) => void handleCreateItem(event)}>
              <input
                value={newItemTitle}
                onChange={(event) => setNewItemTitle(event.target.value)}
                placeholder="Titulo"
                required
              />
              <input
                value={newItemImageUrl}
                onChange={(event) => setNewItemImageUrl(event.target.value)}
                placeholder="URL imagen"
                required
              />
              <input
                value={newItemDescription}
                onChange={(event) => setNewItemDescription(event.target.value)}
                placeholder="Descripcion"
              />
              <button type="submit">Agregar item</button>
            </form>
          )}

          <div className="itemGrid">
            {activeCategoryData?.items.map((item) => (
              <button
                key={item.id}
                className="itemCard"
                onClick={() => setSelectedItem(item)}
                type="button"
              >
                <img src={item.imageUrl} alt={item.title} />
                <strong>{item.title}</strong>
              </button>
            ))}
          </div>
        </main>
      )}

      {selectedItem && (
        <div className="modalOverlay" onClick={() => setSelectedItem(null)} role="presentation">
          <article className="modalCard" onClick={(event) => event.stopPropagation()}>
            <img src={selectedItem.imageUrl} alt={selectedItem.title} />
            <h3>{selectedItem.title}</h3>
            <p>{selectedItem.description || 'Sin descripcion'}</p>
            <small>Slug: {selectedItem.slug}</small>
            <div className="modalActions">
              {canManage && (
                <button
                  className="danger"
                  onClick={() => void handleDeleteItem(selectedItem.id)}
                  type="button"
                >
                  Eliminar
                </button>
              )}
              <button onClick={() => setSelectedItem(null)} type="button">
                Cerrar
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
