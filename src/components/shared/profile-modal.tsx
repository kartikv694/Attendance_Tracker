"use client";

// Full detail view opened from the sidebar's "View Profile" option.
// Hits /api/auth/profile (not just /api/auth/me) because it needs the
// role-specific detail - employee code + assigned classes for a teacher,
// roll number + section + enrollments for a student.

import { useEffect, useState } from "react";
import { ProfileSkeleton } from "@/components/shared/skeleton";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  createdAt: string;
  teacher: {
    employeeCode: string;
    subjectSections: {
      subject: { name: string; code: string };
      section: { name: string; year: number };
    }[];
  } | null;
  student: {
    rollNumber: string;
    section: { name: string; year: number };
    enrollments: { subjectSection: { subject: { name: string; code: string } } }[];
  } | null;
};

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setProfile(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <ProfileSkeleton />
        ) : !profile ? (
          <div className="py-8 text-center text-sm text-slate-500">Failed to load profile</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{profile.name}</div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{profile.role}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div>
                <div className="text-xs text-slate-500">Email</div>
                <div className="font-medium text-slate-900 break-all">{profile.email}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Member since</div>
                <div className="font-medium text-slate-900">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {profile.teacher && (
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Teacher details
                </div>
                <div className="mb-2">
                  <span className="text-slate-500">Employee code: </span>
                  <span className="font-medium text-slate-900">{profile.teacher.employeeCode}</span>
                </div>
                <div className="text-xs text-slate-500 mb-1">Assigned classes</div>
                {profile.teacher.subjectSections.length === 0 ? (
                  <div className="text-xs text-slate-400">No classes assigned yet</div>
                ) : (
                  <ul className="space-y-1">
                    {profile.teacher.subjectSections.map((ss, idx) => (
                      <li key={idx} className="text-xs text-slate-700">
                        {ss.subject.code} - {ss.subject.name} &middot; {ss.section.name} (
                        {ss.section.year})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {profile.student && (
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Student details
                </div>
                <div className="mb-1">
                  <span className="text-slate-500">Roll number: </span>
                  <span className="font-medium text-slate-900">{profile.student.rollNumber}</span>
                </div>
                <div className="mb-2">
                  <span className="text-slate-500">Section: </span>
                  <span className="font-medium text-slate-900">
                    {profile.student.section.name} ({profile.student.section.year})
                  </span>
                </div>
                <div className="text-xs text-slate-500 mb-1">Enrolled subjects</div>
                {profile.student.enrollments.length === 0 ? (
                  <div className="text-xs text-slate-400">No subjects enrolled yet</div>
                ) : (
                  <ul className="space-y-1">
                    {profile.student.enrollments.map((e, idx) => (
                      <li key={idx} className="text-xs text-slate-700">
                        {e.subjectSection.subject.code} - {e.subjectSection.subject.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
