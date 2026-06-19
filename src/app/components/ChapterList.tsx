import { Chapter } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { FileText, Calendar, Type, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';

interface ChapterListProps {
  chapters: Chapter[];
  onSelectChapter: (chapterId: string) => void;
  onReorder: (chapters: Chapter[]) => void;
}

export function ChapterList({ chapters, onSelectChapter, onReorder }: ChapterListProps) {
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    
    const newChapters = [...sortedChapters];
    [newChapters[index], newChapters[index - 1]] = [newChapters[index - 1], newChapters[index]];
    
    const reordered = newChapters.map((ch, idx) => ({ ...ch, order: idx }));
    onReorder(reordered);
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === sortedChapters.length - 1) return;
    
    const newChapters = [...sortedChapters];
    [newChapters[index], newChapters[index + 1]] = [newChapters[index + 1], newChapters[index]];
    
    const reordered = newChapters.map((ch, idx) => ({ ...ch, order: idx }));
    onReorder(reordered);
  };

  return (
    <div className="grid gap-4">
      {sortedChapters.map((chapter, index) => (
        <Card 
          key={chapter.id}
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow bg-white"
          onClick={() => onSelectChapter(chapter.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                  Chapter {index + 1}
                </Badge>
                <h3 className="text-amber-900">{chapter.title}</h3>
              </div>
              
              <div className="flex flex-wrap gap-4 text-amber-700 mt-3">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  <span>{chapter.wordCount.toLocaleString()} words</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Updated {new Date(chapter.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {chapter.content && (
                <p className="text-amber-600 mt-3 line-clamp-2">
                  {chapter.content.substring(0, 150)}...
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleMoveUp(index, e)}
                disabled={index === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleMoveDown(index, e)}
                disabled={index === sortedChapters.length - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
