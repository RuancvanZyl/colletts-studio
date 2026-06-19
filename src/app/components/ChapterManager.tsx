import { useState } from 'react';
import { Chapter, Character } from '../App';
import { ChapterList } from './ChapterList';
import { ChapterEditor } from './ChapterEditor';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, ArrowLeft } from 'lucide-react';

interface ChapterManagerProps {
  chapters: Chapter[];
  setChapters: (chapters: Chapter[]) => void;
  characters: Character[];
}

export function ChapterManager({ chapters, setChapters, characters }: ChapterManagerProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const selectedChapter = chapters.find(ch => ch.id === selectedChapterId);

  const handleCreateChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${chapters.length + 1}`,
      content: '',
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: chapters.length,
    };
    setChapters([...chapters, newChapter]);
    setSelectedChapterId(newChapter.id);
  };

  const handleUpdateChapter = (updatedChapter: Chapter) => {
    setChapters(chapters.map(ch => 
      ch.id === updatedChapter.id ? updatedChapter : ch
    ));
  };

  const handleDeleteChapter = (chapterId: string) => {
    setChapters(chapters.filter(ch => ch.id !== chapterId));
    if (selectedChapterId === chapterId) {
      setSelectedChapterId(null);
    }
  };

  const handleReorderChapters = (reorderedChapters: Chapter[]) => {
    setChapters(reorderedChapters);
  };

  if (selectedChapter) {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setSelectedChapterId(null)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Chapters
        </Button>
        <ChapterEditor
          chapter={selectedChapter}
          onUpdate={handleUpdateChapter}
          onDelete={handleDeleteChapter}
          characters={characters}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-amber-900 mb-1">Your Chapters</h2>
          <p className="text-amber-700">
            {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} • {chapters.reduce((sum, ch) => sum + ch.wordCount, 0).toLocaleString()} total words
          </p>
        </div>
        <Button onClick={handleCreateChapter}>
          <Plus className="w-4 h-4 mr-2" />
          New Chapter
        </Button>
      </div>

      {chapters.length === 0 ? (
        <Card className="p-12 text-center bg-white/50 backdrop-blur">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-amber-600" />
          <h3 className="text-amber-900 mb-2">No chapters yet</h3>
          <p className="text-amber-700 mb-4">Start your story by creating your first chapter</p>
          <Button onClick={handleCreateChapter}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Chapter
          </Button>
        </Card>
      ) : (
        <ChapterList
          chapters={chapters}
          onSelectChapter={setSelectedChapterId}
          onReorder={handleReorderChapters}
        />
      )}
    </div>
  );
}

import { BookOpen } from 'lucide-react';
