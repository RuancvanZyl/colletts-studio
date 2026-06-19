import { useState } from 'react';
import { Character, Chapter } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Save, Trash2, BookOpen, User } from 'lucide-react';

interface CharacterFormProps {
  character?: Character;
  onSave: (character: Character) => void;
  onDelete: (characterId: string) => void;
  onCancel: () => void;
  chapters: Chapter[];
}

export function CharacterForm({ character, onSave, onDelete, onCancel, chapters }: CharacterFormProps) {
  const [name, setName] = useState(character?.name || '');
  const [role, setRole] = useState(character?.role || '');
  const [description, setDescription] = useState(character?.description || '');
  const [arc, setArc] = useState(character?.arc || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const characterData: Character = {
      id: character?.id || '',
      name,
      role,
      description,
      arc,
      appearances: character?.appearances || [],
      createdAt: character?.createdAt || '',
    };

    onSave(characterData);
  };

  // Find chapters where this character appears
  const appearances = character 
    ? chapters.filter(chapter => 
        chapter.content.toLowerCase().includes(character.name.toLowerCase())
      )
    : [];

  return (
    <form onSubmit={handleSubmit}>
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-amber-900">
              {character ? 'Edit Character' : 'New Character'}
            </h2>
            {character && (
              <p className="text-amber-700">
                Created {new Date(character.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Character Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-2"
              placeholder="Enter character name..."
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="mt-2"
              placeholder="e.g., Protagonist, Antagonist, Supporting..."
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-[120px]"
              placeholder="Physical appearance, personality traits, background..."
            />
          </div>

          <div>
            <Label htmlFor="arc">Character Arc</Label>
            <Textarea
              id="arc"
              value={arc}
              onChange={(e) => setArc(e.target.value)}
              className="mt-2 min-h-[120px]"
              placeholder="Character development, goals, transformation throughout the story..."
            />
          </div>

          {appearances.length > 0 && (
            <div>
              <Label className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Appears in {appearances.length} {appearances.length === 1 ? 'chapter' : 'chapters'}
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {appearances.map((chapter, index) => (
                  <Badge key={chapter.id} variant="secondary" className="bg-amber-100 text-amber-900">
                    Chapter {chapters.findIndex(ch => ch.id === chapter.id) + 1}: {chapter.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-6 border-t">
          <div>
            {character && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Character
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Character?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete "{character.name}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(character.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Save Character
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
