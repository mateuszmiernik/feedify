import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label"

export function RegisterForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState('');

    return(
      <form>
        <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
            
            >
            </Input>
        </div>
      </form>
    )
}

