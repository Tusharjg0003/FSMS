// src/app/profile/page.tsx  (Admin & Supervisor)
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  const me = useMemo(
    () =>
      (session?.user ?? {}) as {
        name?: string;
        email?: string;
        role?: 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN' | string;
        image?: string | null;
      },
    [session]
  );

  // only allow ADMIN / SUPERVISOR here
  useEffect(() => {
    if (status === 'authenticated' && me.role === 'TECHNICIAN') {
      router.push('/technician/profile'); // your tech page
    }
  }, [status, me.role, router]);

  const [name, setName] = useState(me.name ?? '');
  const [email, setEmail] = useState(me.email ?? '');
  const [profilePicture, setProfilePicture] = useState<string | null>(me.image ?? null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(me.name ?? '');
    setEmail(me.email ?? '');
    setProfilePicture(me.image ?? null);
  }, [me.name, me.email, me.image]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }
  if (!session?.user) return null;

  const rolePill =
    me.role === 'ADMIN'
      ? 'bg-red-100 text-red-800 border border-red-200'
      : me.role === 'SUPERVISOR'
      ? 'bg-orange-100 text-orange-800 border border-orange-200'
      : 'bg-gray-100 text-gray-800 border border-gray-200';

    async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'Upload failed');

        const url = body.url as string;
        setProfilePicture(url);

        // 🔴 Persist the new picture immediately
        const savePic = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, profilePicture: url }),
        });
        if (!savePic.ok) {
        const b = await savePic.json().catch(() => ({}));
        throw new Error(b?.error || 'Failed to save picture');
        }

        // 🔄 refresh session image so UI sticks without reload
        // @ts-ignore
        await update?.({ image: url });

        setMsg({ type: 'ok', text: 'Profile picture updated.' });
    } catch (err: any) {
        setMsg({ type: 'err', text: err.message || 'Failed to upload image.' });
    } finally {
        setUploading(false);
    }
    }

    async function onSave() {
    setMsg(null);
    if (!name.trim()) return setMsg({ type: 'err', text: 'Name is required.' });
    if (!email.trim()) return setMsg({ type: 'err', text: 'Email is required.' });

    setSaving(true);
    try {
        // 🟢 Save name/email AND picture together
        const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            profilePicture: profilePicture ?? undefined,
        }),
        });
        const raw = await res.text();
        let body: any = {};
        try { body = JSON.parse(raw); } catch {}

        if (!res.ok) {
        throw new Error(body?.error || body?.message || 'Failed to update profile.');
        }

        // 🔄 refresh session values including image
        // @ts-ignore
        await update?.({ name: name.trim(), email: email.trim(), image: profilePicture ?? null });

        setMsg({ type: 'ok', text: 'Profile updated successfully.' });
        router.refresh();
    } catch (err: any) {
        setMsg({ type: 'err', text: err.message || 'Failed to update profile.' });
    } finally {
        setSaving(false);
    }
    }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
          {/* top: avatar & basic */}
          <div className="flex items-start gap-6 mb-8">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={name || 'User'}
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold">
                {name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}

            <div className="flex-1">
              <div className="text-sm text-gray-600">Signed in as</div>
              <div className="text-lg font-semibold text-gray-900">{me.email}</div>
              <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-medium ${rolePill}`}>
                {me.role ?? 'USER'}
              </span>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Profile Picture
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                             file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700
                             hover:file:bg-blue-100 border border-gray-200 rounded-md p-2"
                />
              </div>
            </div>
          </div>

          {msg && (
            <div
              className={`mb-6 rounded-md p-3 text-sm ${
                msg.type === 'ok'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {msg.text}
            </div>
          )}

          {/* form: name + email only */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={onSave}
                disabled={saving || uploading}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
