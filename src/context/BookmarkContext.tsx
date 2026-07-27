import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Article, Bookmark } from '../types';
import { useAuth } from './AuthContext';

interface BookmarkContextType {
  bookmarks: Bookmark[];
  isBookmarked: (articleId: string) => boolean;
  toggleBookmark: (article: Article) => Promise<void>;
  isLoading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load bookmarks on auth state change & sync guest bookmarks
  useEffect(() => {
    async function loadBookmarks() {
      setIsLoading(true);
      if (user) {
        try {
          // Check if guest bookmarks exist in localStorage
          const guestRaw = localStorage.getItem('guest_bookmarks');
          if (guestRaw) {
            const guestList = JSON.parse(guestRaw);
            if (Array.isArray(guestList) && guestList.length > 0) {
              const syncRes = await api.post<{ bookmarks: Bookmark[] }>('/bookmarks/sync', {
                bookmarks: guestList,
              });
              localStorage.removeItem('guest_bookmarks');
              setBookmarks(syncRes.bookmarks);
              setIsLoading(false);
              return;
            }
          }

          const data = await api.get<{ bookmarks: Bookmark[] }>('/bookmarks');
          setBookmarks(data.bookmarks);
        } catch (err) {
          console.warn('Error loading backend bookmarks', err);
        }
      } else {
        // Guest mode - load from localStorage
        try {
          const raw = localStorage.getItem('guest_bookmarks');
          if (raw) {
            setBookmarks(JSON.parse(raw));
          } else {
            setBookmarks([]);
          }
        } catch (err) {
          setBookmarks([]);
        }
      }
      setIsLoading(false);
    }

    loadBookmarks();
  }, [user]);

  const isBookmarked = (articleId: string) => {
    return bookmarks.some((b) => b.article_id === articleId || b.id === articleId);
  };

  const toggleBookmark = async (article: Article) => {
    const exists = isBookmarked(article.id);

    if (exists) {
      // Optimistically remove
      setBookmarks((prev) => prev.filter((b) => b.article_id !== article.id && b.id !== article.id));

      if (user) {
        try {
          await api.delete(`/bookmarks/${article.id}`);
        } catch (err) {
          console.error('Failed to sync bookmark deletion to backend', err);
        }
      } else {
        const updated = bookmarks.filter((b) => b.article_id !== article.id && b.id !== article.id);
        localStorage.setItem('guest_bookmarks', JSON.stringify(updated));
      }
    } else {
      // Optimistically add
      const newBm: Bookmark = {
        id: `bm_local_${Date.now()}`,
        user_id: user ? user.id : 'guest',
        article_id: article.id,
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        url_to_image: article.urlToImage,
        published_at: article.publishedAt,
        source_name: article.source.name,
        category: article.category,
        saved_at: new Date().toISOString(),
      };

      setBookmarks((prev) => [newBm, ...prev]);

      if (user) {
        try {
          const res = await api.post<{ bookmark: Bookmark }>('/bookmarks', {
            article_id: article.id,
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            url_to_image: article.urlToImage,
            published_at: article.publishedAt,
            source_name: article.source.name,
            category: article.category,
          });
          // Update with real server ID
          setBookmarks((prev) => prev.map((b) => (b.article_id === article.id ? res.bookmark : b)));
        } catch (err) {
          console.error('Failed to sync bookmark addition to backend', err);
        }
      } else {
        const updated = [newBm, ...bookmarks];
        localStorage.setItem('guest_bookmarks', JSON.stringify(updated));
      }
    }
  };

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        isBookmarked,
        toggleBookmark,
        isLoading,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};
