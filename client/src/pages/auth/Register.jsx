import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthShell from './AuthShell';
import { Button } from '../../components/ui/button';
import { Input, Label, Select } from '../../components/ui/input';
import { useAuth } from '../../store/auth';
import { toast } from 'sonner';

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const { register: signup } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await signup(data);
      toast.success('Account created! Let’s personalize your feed.');
      navigate('/onboarding');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Discover events, earn QR passes and connect with your community."
      footer={<>Already have an account? <Link to="/login" className="font-bold text-primary hover:underline">Log in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Full name</Label>
          <div className="mt-1">
            <Input placeholder="Aarav Verma" error={errors.name} {...register('name', { required: 'Name is required' })} />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <div className="mt-1">
            <Input type="email" placeholder="you@example.com" error={errors.email}
              {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
          </div>
        </div>
        <div>
          <Label>I want to join as</Label>
          <div className="mt-1">
            <Select {...register('role')}>
              <option value="attendee">Attendee — discover & join events</option>
              <option value="organizer">Organizer — create & run events</option>
              <option value="speaker">Speaker</option>
              <option value="volunteer">Volunteer</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Password</Label>
          <div className="mt-1">
            <Input type="password" placeholder="At least 6 characters" error={errors.password}
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })} />
          </div>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Create account</Button>
        <p className="text-center text-xs text-muted-foreground">By continuing you agree to EventSphere’s demo terms & code of conduct.</p>
      </form>
    </AuthShell>
  );
}
