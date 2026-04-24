"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AuthService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/app/contexts/profile.context";
import { PROFILE_STRINGS } from "@/lib/constants";
import { getImageUrl } from "@/lib/utils";
import { highlightAndScroll, highlightCharacters, getId } from "@/lib/utils-tsx";
import { profileSearchIndex } from "@/public/search-index";
import { IProfile, PROFILE_SEARCH_KEYS } from "@/lib/types";

const PROFILE_SEARCH_INDEX = profileSearchIndex;
const NAME_LETTERS_AND_SPACES_REGEX = /^[\p{L} ]+$/u;

function sanitizeLettersAndSpacesForInput(value: string) {
    return value.replace(/[^\p{L}\s]+/gu, "");
}

function sanitizeLettersAndSpaces(value: string) {
    return value
        .replace(/[^\p{L}\s]+/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

export default function ProfilePage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const form = useForm({
        defaultValues: { name: "", email: "", img: "", role: "" },
    });
    const highlightKey = searchParams.get("highlight");
    const highlightQuery = searchParams.get("q") || "";
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isImageChange, setIsImageChange] = useState(false);
    const lastProfile = useRef<IProfile>({ name: "", email: "", img: "", role: "" });
    const { profile, setProfile } = useProfile();

    // Load profile on mount
    useEffect(() => {
        let mounted = true;
        const fetchProfile = async () => {
            setLoading(true);
            setError("");
            try {
                const service = new AuthService();
                const profileData = await service.getProfile();
                if (!mounted) return;
                const sanitizedName = sanitizeLettersAndSpaces(profileData.name || "");
                lastProfile.current = { name: sanitizedName, email: profileData.email || "", img: profileData.img || "", role: profileData.role || "" };
                setProfile({ ...profileData, name: sanitizedName });
                form.reset(lastProfile.current);
                setPreview(profileData.img || null);
            } catch (err: any) {
                setError(err.message || PROFILE_STRINGS.toast.profileLoadError.title);
                toast({ title: PROFILE_STRINGS.toast.profileLoadError.title, description: PROFILE_STRINGS.toast.profileLoadError.description, variant: "destructive" });
            } finally {
                if (mounted) setLoading(false);
            }
        };
        // If context already has profile, use it, else fetch
        if (profile && profile.email) {
            const sanitizedName = sanitizeLettersAndSpaces(profile.name || "");
            lastProfile.current = { name: sanitizedName, email: profile.email || "", img: profile.img || "", role: profile.role || "" };
            form.reset(lastProfile.current);
            setPreview(profile.img || null);
            setLoading(false);
        } else {
            fetchProfile();
        }
        return () => { mounted = false; };
    }, [form, toast, profile, setProfile]);

    // Reset form if page unmounts
    useEffect(() => () => form.reset(lastProfile.current), [form]);

    // Highlight and scroll to the element with the id of the highlightKey
    useEffect(() => {
        if (highlightKey) {
            highlightAndScroll(highlightKey as PROFILE_SEARCH_KEYS, PROFILE_SEARCH_INDEX);
        }
    }, [highlightKey]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setIsImageChange(false);
            setImageFile(null);
            setPreview(null);
            form.setValue("img", "", { shouldDirty: true });
            return;
        }
        setIsImageChange(true);
        setImageFile(file || null);

        setPreview(file ? URL.createObjectURL(file) : form.getValues("img"));
        if (file) form.setValue("img", file.name, { shouldDirty: true });
    };

    const onSubmit = async (values: { name: string; email: string; img: string; role: string }) => {
        const cleanedName = sanitizeLettersAndSpaces(values.name);
        if (cleanedName.length < 2) {
            form.setError("name", { type: "manual", message: "Name must be at least 2 letters." });
            return;
        }
        if (!NAME_LETTERS_AND_SPACES_REGEX.test(cleanedName)) {
            form.setError("name", { type: "manual", message: "Only letters and spaces are allowed." });
            return;
        }

        if (!values.img || values.img === "") {
            toast({ title: PROFILE_STRINGS.toast.profileImageError.title, description: PROFILE_STRINGS.toast.profileImageError.description, variant: "destructive" });
            return;
        }
        setLoading(true);
        setError("");
        try {
            let imgUrl = values.img;
            if (imageFile) {
                imgUrl = await new AuthService().uploadProfileImage(imageFile);
            }
            await new AuthService().updateProfile({ name: cleanedName, img: imgUrl });
            lastProfile.current = { ...values, name: cleanedName, img: imgUrl };
            setProfile({ ...values, name: cleanedName, img: imgUrl });
            form.reset(lastProfile.current);
            setIsImageChange(false);
            setPreview(imgUrl);
            setImageFile(null);
            toast({ title: PROFILE_STRINGS.toast.profileUpdated.title, description: PROFILE_STRINGS.toast.profileUpdated.description, variant: "success" });
        } catch (err: any) {
            setError(err.message || PROFILE_STRINGS.toast.profileUpdateError.title);
            toast({ title: PROFILE_STRINGS.toast.profileUpdateError.title, description: PROFILE_STRINGS.toast.profileUpdateError.description, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDiscard = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        if (isImageChange && preview) {
            URL.revokeObjectURL(preview);
        }
        form.reset(lastProfile.current);
        setPreview(lastProfile.current.img || null);
        setImageFile(null);
        setIsImageChange(false);
        toast({ title: PROFILE_STRINGS.toast.profileDiscard.title, description: PROFILE_STRINGS.toast.profileDiscard.description });
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            <h1 id={getId(PROFILE_SEARCH_KEYS.mainTitle, PROFILE_SEARCH_INDEX)} className="text-2xl font-bold mb-6">
                {highlightKey === PROFILE_SEARCH_KEYS.mainTitle && highlightQuery ? highlightCharacters(PROFILE_STRINGS.main.title, highlightQuery) : PROFILE_STRINGS.main.title}
            </h1>
            {error && <div className="mb-4 text-red-500">{error}</div>}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField name="img" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor={getId(PROFILE_SEARCH_KEYS.tableLabelsProfileImage, PROFILE_SEARCH_INDEX)} id={`label-${getId(PROFILE_SEARCH_KEYS.tableLabelsProfileImage, PROFILE_SEARCH_INDEX)}`}>
                                {highlightKey === PROFILE_SEARCH_KEYS.tableLabelsProfileImage && highlightQuery ? highlightCharacters(PROFILE_STRINGS.table.labels.profileImage, highlightQuery) : PROFILE_STRINGS.table.labels.profileImage}
                            </FormLabel>
                            <FormControl>
                                <div>
                                    <Input id={getId(PROFILE_SEARCH_KEYS.tableLabelsProfileImage, PROFILE_SEARCH_INDEX)} type="file" accept="image/*" onChange={handleImageChange} disabled={loading} ref={fileInputRef} />
                                    {preview && (
                                        <Avatar className="mt-2 h-16 w-16">
                                            <AvatarImage
                                                src={/^blob:|^data:|^https?:\/\//i.test(preview) ? preview : getImageUrl(preview)}
                                                alt={PROFILE_STRINGS.table.labels.profileImageAlt}
                                            />
                                            <AvatarFallback>{form.getValues("name")?.[0] || "A"}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="name" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor={getId(PROFILE_SEARCH_KEYS.tableLabelsName, PROFILE_SEARCH_INDEX)} id={`label-${getId(PROFILE_SEARCH_KEYS.tableLabelsName, PROFILE_SEARCH_INDEX)}`}>
                                {highlightKey === PROFILE_SEARCH_KEYS.tableLabelsName && highlightQuery ? highlightCharacters(PROFILE_STRINGS.table.labels.name, highlightQuery) : PROFILE_STRINGS.table.labels.name}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    id={getId(PROFILE_SEARCH_KEYS.tableLabelsName, PROFILE_SEARCH_INDEX)}
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(event) => field.onChange(sanitizeLettersAndSpacesForInput(event.target.value))}
                                    placeholder={PROFILE_STRINGS.table.placeholders.name}
                                    disabled={loading}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="email" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor={getId(PROFILE_SEARCH_KEYS.tableLabelsEmail, PROFILE_SEARCH_INDEX)} id={`label-${getId(PROFILE_SEARCH_KEYS.tableLabelsEmail, PROFILE_SEARCH_INDEX)}`}>
                                {highlightKey === PROFILE_SEARCH_KEYS.tableLabelsEmail && highlightQuery ? highlightCharacters(PROFILE_STRINGS.table.labels.email, highlightQuery) : PROFILE_STRINGS.table.labels.email}
                            </FormLabel>
                            <FormControl>
                                <Input id={getId(PROFILE_SEARCH_KEYS.tableLabelsEmail, PROFILE_SEARCH_INDEX)} {...field} placeholder={PROFILE_STRINGS.table.placeholders.email} type="email" readOnly disabled />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="role" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor={getId(PROFILE_SEARCH_KEYS.tableLabelsRole, PROFILE_SEARCH_INDEX)} id={`label-${getId(PROFILE_SEARCH_KEYS.tableLabelsRole, PROFILE_SEARCH_INDEX)}`}>
                                {highlightKey === PROFILE_SEARCH_KEYS.tableLabelsRole && highlightQuery ? highlightCharacters(PROFILE_STRINGS.table.labels.role, highlightQuery) : PROFILE_STRINGS.table.labels.role}
                            </FormLabel>
                            <FormControl>
                                <Input id={getId(PROFILE_SEARCH_KEYS.tableLabelsRole, PROFILE_SEARCH_INDEX)} {...field} placeholder={PROFILE_STRINGS.table.placeholders.role} type="text" readOnly disabled />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <div className="flex gap-2">
                        {form.formState.isDirty && (
                            <>
                                <Button type="submit" disabled={loading} className="w-1/2">{loading ? PROFILE_STRINGS.table.actions.saving : PROFILE_STRINGS.table.actions.save}</Button>
                                <Button type="button" variant="destructive" onClick={handleDiscard} disabled={loading} className="w-1/2">{PROFILE_STRINGS.table.actions.discard}</Button>
                            </>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    );
} 
