import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheckIcon, LoaderCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LicenseInfo } from '@/features/setup/queries';
import { useSetupAdmin } from '@/features/setup/queries';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import SetupShell from '@/pages/setup/SetupShell';

const schema = z
  .object({
    name: z.string().trim().min(1, 'Nama wajib diisi'),
    email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
    password: z.string().min(8, 'Minimal 8 karakter'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Password tidak sama' });

type FormValues = z.infer<typeof schema>;

/** First run, step 2: the first admin account, then straight into the panel (step 3: Profil RS). */
export default function CreateAdminPage({ license }: { license: LicenseInfo | null }) {
  const setupAdmin = useSetupAdmin();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await setupAdmin.mutateAsync({ name: values.name, email: values.email, password: values.password });
      await login(values.email, values.password, false);
      navigate('/', { replace: true });
    } catch (err) {
      // Login throws a plain Error with the API's message; the setup call an axios error.
      setError(err instanceof Error && !('isAxiosError' in err) ? err.message : apiErrorMessage(err, 'Gagal membuat akun'));
    }
  };

  const field = (id: keyof FormValues, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-11" aria-invalid={!!errors[id]} {...props} {...register(id)} />
      {errors[id] && <p className="text-xs text-destructive">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <SetupShell step={2} title="Buat Akun Admin" description="Akun ini dipakai untuk mengelola aplikasi dan menambah user lain.">
      {license && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
          <BadgeCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Lisensi aktif untuk <span className="font-semibold">{license.rs}</span>
            <span className="text-muted-foreground"> · {license.no}</span>
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {field('name', 'Nama', { autoComplete: 'name' })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        {field('confirm', 'Ulangi password', { type: 'password', autoComplete: 'new-password' })}
        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
          Buat akun & lanjut
        </Button>
      </form>
    </SetupShell>
  );
}
