import { useState } from 'react';
import { Chapter, Character } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Trash2, Save, Type, Calendar, Users } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ChapterEditorProps {
  chapter: Chapter;
  onUpdate: (chapter: Chapter) => void;
  onDelete: (chapterId: string) => void;
  characters: Character[];
}

export function ChapterEditor({ chapter, onUpdate, onDelete, characters }: ChapterEditorProps) {
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content);

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

  const handleSave = () => {
    const updatedChapter: Chapter = {
      ...chapter,
      title,
      content,
      wordCount,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedChapter);
  };

  // Find characters mentioned in this chapter
  const mentionedCharacters = characters.filter(char => 
    content.toLowerCase().includes(char.name.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <Label htmlFor="chapter-title">Chapter Title</Label>
            <Input
              id="chapter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2"
              placeholder="Enter chapter title..."
            />
          </div>
          <div className="flex gap-2 ml-4">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Chapter?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete "{chapter.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(chapter.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-amber-700">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <span>{wordCount} words</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Created {new Date(chapter.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {mentionedCharacters.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-amber-700" />
              <Label>Characters in this chapter</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {mentionedCharacters.map(char => (
                <Badge key={char.id} variant="secondary" className="bg-purple-100 text-purple-900">
                  {char.name} • {char.role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="chapter-content">Content</Label>
          <Textarea
            id="chapter-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-2 min-h-[500px] resize-y"
            placeholder="Start writing your chapter..."
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
