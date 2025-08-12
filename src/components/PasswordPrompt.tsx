import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordPromptProps {
  isOpen: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function PasswordPrompt({ 
  isOpen, 
  onSubmit, 
  onCancel, 
  title = "Enter PIN",
  description = "Please enter your PIN to decrypt your file list:"
}: PasswordPromptProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password.trim());
      setPassword(''); // Clear password immediately
      // Don't call onCancel here - let the parent component handle closing
    }
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{description}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your PIN"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!password.trim()}>
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}