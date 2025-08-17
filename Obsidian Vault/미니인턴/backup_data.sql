--
-- PostgreSQL database dump
--

\restrict cXnA7ed6fRpzK0tI1KVW0c9X3U3cqZiCW9INybquX0d62u3cxZan4caXch3hBgx

-- Dumped from database version 15.14 (Homebrew)
-- Dumped by pg_dump version 15.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: macbook
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO macbook;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: macbook
--

CREATE TABLE public.applications (
    id text NOT NULL,
    "userId" text NOT NULL,
    "classId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.applications OWNER TO macbook;

--
-- Name: mclasses; Type: TABLE; Schema: public; Owner: macbook
--

CREATE TABLE public.mclasses (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "maxParticipants" integer NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    "hostId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.mclasses OWNER TO macbook;

--
-- Name: users; Type: TABLE; Schema: public; Owner: macbook
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO macbook;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: macbook
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d02cf0c4-4002-41f5-b3bf-e8aaa03aa272	3b796cfe1bdd1478ebeaef214a90018fd9f368de9f3be5f01a9566237806ef48	2025-08-17 15:41:57.730429+09	20250817064157_init_postgresql	\N	\N	2025-08-17 15:41:57.72573+09	1
\.


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: macbook
--

COPY public.applications (id, "userId", "classId", "createdAt") FROM stdin;
\.


--
-- Data for Name: mclasses; Type: TABLE DATA; Schema: public; Owner: macbook
--

COPY public.mclasses (id, title, description, "maxParticipants", "startAt", "endAt", "hostId", "createdAt", "updatedAt") FROM stdin;
b93771a0-6b05-4de6-bf2d-eef1b81d6543	Test M-Class	A test class for testing purposes	10	2025-08-17 02:16:10.821	2025-08-17 03:16:10.821	bec06b71-7c18-497e-b17e-c70aa6da731d	2025-08-16 02:16:10.822	2025-08-16 02:16:10.822
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: macbook
--

COPY public.users (id, email, password, "isAdmin", "createdAt", "updatedAt") FROM stdin;
bec06b71-7c18-497e-b17e-c70aa6da731d	admin@test.com	$2b$10$test.hashed.password	t	2025-08-16 02:16:10.82	2025-08-16 02:16:10.82
53953860-799f-405f-888d-851ef105eddd	user@test.com	$2b$10$test.hashed.password	f	2025-08-16 02:16:10.821	2025-08-16 02:16:10.821
11bcf27c-f69a-49ed-bd84-310cf37788c5	user@example.com	$2b$12$wAKyESzk9445rD6N/KxctuRMp4aN3YKh700GGMhH0.HFcEHr/tFXC	f	2025-08-16 06:52:05.729	2025-08-16 06:52:05.729
fb6392ae-51b9-4c80-8562-07669f206625	user1@example.com	$2b$12$hlSe7asBzEvPuMrLkdLwkex2Le5i4DyqQ0BdJr4H.YLJG9NodzFI2	f	2025-08-16 06:52:46.696	2025-08-16 06:52:46.696
390619e9-15db-4ee6-9260-9a902a355bfd	user2@example.com	$2b$12$lVO5ggjwGucDG4CL2hpJ1.FdNDbkMNQq3BScH1IhXsLini8UlA44m	f	2025-08-16 07:09:25.053	2025-08-16 07:09:25.053
a9c92460-b53e-47c6-855e-2007389ef0c1	newadmin@test.com	$2b$12$qXetQkUrRtfOhX.EIu89C.lIK0qMlT/ozNpSo5Rm90Rmf49toXcDy	f	2025-08-17 06:49:39.811	2025-08-17 06:49:39.811
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: macbook
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: macbook
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: mclasses mclasses_pkey; Type: CONSTRAINT; Schema: public; Owner: macbook
--

ALTER TABLE ONLY public.mclasses
    ADD CONSTRAINT mclasses_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: macbook
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: applications_userId_classId_key; Type: INDEX; Schema: public; Owner: macbook
--

CREATE UNIQUE INDEX "applications_userId_classId_key" ON public.applications USING btree ("userId", "classId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: macbook
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: applications applications_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: macbook
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT "applications_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.mclasses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: applications applications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: macbook
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mclasses mclasses_hostId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: macbook
--

ALTER TABLE ONLY public.mclasses
    ADD CONSTRAINT "mclasses_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict cXnA7ed6fRpzK0tI1KVW0c9X3U3cqZiCW9INybquX0d62u3cxZan4caXch3hBgx

