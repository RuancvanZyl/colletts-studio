import { useState } from 'react';
import { Character, Chapter } from '../App';
import { CharacterList } from './CharacterList';
import { CharacterForm } from './CharacterForm';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, ArrowLeft, Users } from 'lucide-react';

interface CharacterTrackerProps {
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  chapters: Chapter[];
}

export function CharacterTracker({ characters, setCharacters, chapters }: CharacterTrackerProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedCharacter = characters.find(char => char.id === selectedCharacterId);

  const handleCreateCharacter = () => {
    setIsCreating(true);
    setSelectedCharacterId(null);
  };

  const handleSaveCharacter = (character: Character) => {
    if (character.id) {
      // Update existing
      setCharacters(characters.map(ch => 
        ch.id === character.id ? character : ch
      ));
    } else {
      // Create new
      const newCharacter = {
        ...character,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      setCharacters([...characters, newCharacter]);
    }
    setIsCreating(false);
    setSelectedCharacterId(null);
  };

  const handleDeleteCharacter = (characterId: string) => {
    setCharacters(characters.filter(ch => ch.id !== characterId));
    setSelectedCharacterId(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setSelectedCharacterId(null);
  };

  if (isCreating || selectedCharacter) {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Characters
        </Button>
        <CharacterForm
          character={selectedCharacter}
          onSave={handleSaveCharacter}
          onDelete={handleDeleteCharacter}
          onCancel={handleCancel}
          chapters={chapters}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-amber-900 mb-1">Your Characters</h2>
          <p className="text-amber-700">
            {characters.length} {characters.length === 1 ? 'character' : 'characters'} in your story
          </p>
        </div>
        <Button onClick={handleCreateCharacter}>
          <Plus className="w-4 h-4 mr-2" />
          New Character
        </Button>
      </div>

      {characters.length === 0 ? (
        <Card className="p-12 text-center bg-white/50 backdrop-blur">
          <Users className="w-12 h-12 mx-auto mb-4 text-purple-600" />
          <h3 className="text-amber-900 mb-2">No characters yet</h3>
          <p className="text-amber-700 mb-4">Build your cast by creating your first character</p>
          <Button onClick={handleCreateCharacter}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Character
          </Button>
        </Card>
      ) : (
        <CharacterList
          characters={characters}
          chapters={chapters}
          onSelectCharacter={setSelectedCharacterId}
        />
      )}
    </div>
  );
}
