import React from 'react';
import { Book, Difficulty } from '../types';
import { BookOpen, Star } from 'lucide-react';

interface BookCardProps {
  book: Book;
  isRecommendation?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  isRecommendation = false, 
  isFavorite = false,
  onToggleFavorite 
}) => {
  const getDifficultyStyle = (diff: Difficulty) => {
    switch (diff) {
      case Difficulty.BEGINNER: return 'text-acid border-acid';
      case Difficulty.INTERMEDIATE: return 'text-lavender border-lavender';
      case Difficulty.ADVANCED: return 'text-pink-500 border-pink-500';
      default: return 'text-white border-white';
    }
  };

  // Fallback abstract images if no specific cover is provided (using Unsplash source for randomness/aesthetic)
  const displayImage = book.coverUrl || `https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800&auto=format&fit=crop`;

  return (
    <div className="group bg-surface rounded-2xl border border-white/10 transition-all duration-300 hover:border-acid hover:shadow-[0_0_20px_rgba(204,255,0,0.1)] flex flex-col h-full relative overflow-hidden">
      
      {/* Image Container */}
      <div className="h-48 w-full overflow-hidden relative">
         <img 
           src={displayImage} 
           alt={book.title}
           className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-90"></div>
         
         {/* Badge Overlay */}
         <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
            {isRecommendation && (
              <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-black/50 backdrop-blur-md font-bold border ${getDifficultyStyle(book.difficulty)} flex items-center gap-1`}>
                {book.difficulty}
              </span>
            )}
         </div>
      </div>

      <div className="p-6 flex flex-col flex-grow relative z-10 -mt-2">
        <div className="mb-4">
          <h3 className="text-xl font-display font-bold text-white tracking-tight leading-none group-hover:text-acid transition-colors mb-1">{book.title}</h3>
          {book.author && <p className="text-xs text-stone-500 font-mono uppercase tracking-wide">By {book.author}</p>}
        </div>

        <p className="text-stone-400 text-sm mb-6 flex-grow leading-relaxed font-light line-clamp-3">
          {book.summary}
        </p>

        {isRecommendation && book.reason && (
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6 backdrop-blur-sm">
            <p className="text-xs text-stone-300">
              <span className="font-display font-bold text-acid text-[10px] uppercase tracking-wider block mb-1">Vibe Match</span>
              "{book.reason}"
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-white/10 flex gap-3 mt-auto">
          <button className="flex-1 bg-white text-black hover:bg-acid transition-colors py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
             <BookOpen size={14} /> Preview
          </button>
          <button 
            onClick={onToggleFavorite}
            className={`p-3 rounded-xl transition-colors border ${
              isFavorite 
                ? 'bg-acid/20 border-acid text-acid shadow-[0_0_10px_rgba(204,255,0,0.2)]' 
                : 'bg-white/5 border-white/5 text-stone-400 hover:text-acid hover:bg-white/10'
            }`}
          >
            <Star size={16} className={isFavorite ? "fill-acid" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;