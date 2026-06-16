# ApplyMate AI - Product Requirements Document

## Overview

ApplyMate AI is a web application that helps job seekers create personalized cover letters based on their resume and a target job posting.

Users upload their resume and provide either a job description or a job posting URL. The system analyzes both inputs using Gemini and generates:

- Job match analysis
- Missing skills analysis
- Recruiter priorities
- Tailored cover letter

The goal is to reduce the time required to create high-quality job applications while increasing relevance to specific job opportunities.

---

# Problem Statement

Many job seekers use the same cover letter for every application or rely on generic AI-generated responses.

This results in:

- Poor personalization
- Low alignment with job requirements
- Reduced interview opportunities

Creating a customized cover letter manually can take 15–30 minutes per application.

ApplyMate AI reduces this process to less than one minute.

---

# Target Users

## Primary Users

- Software Developers
- Designers
- Product Managers
- Marketing Professionals
- Remote Workers

## Secondary Users

- Fresh Graduates
- Career Switchers
- Freelancers seeking full-time employment

---

# Goals

## User Goals

- Generate a personalized cover letter quickly
- Understand how well their resume matches a job posting
- Identify skill gaps

## Business Goals

- Demonstrate a useful AI-powered workflow
- Validate demand for AI-assisted job applications
- Create a foundation for future career tools

---

# Functional Requirements

## FR-01 Resume Upload

### Description

Users must be able to upload a resume.

### Supported Formats

- PDF
- DOCX

### Acceptance Criteria

- User can upload a file successfully
- System extracts text content
- Invalid file types are rejected

---

## FR-02 Job Description Input

### Description

Users can paste a job description manually.

### Acceptance Criteria

- Multi-line text supported
- Minimum 100 characters required
- Content stored temporarily for processing

---

## FR-03 Job URL Input

### Description

Users can provide a job posting URL.

### Acceptance Criteria

- URL validation performed
- System retrieves page content
- Extracted content is used as job description input

### Supported Sources

- Greenhouse
- Lever
- LinkedIn (best effort)
- Generic company career pages

---

## FR-04 Resume Analysis

### Description

System analyzes uploaded resume.

### Output

- Candidate summary
- Skills
- Experience highlights
- Strengths

### Acceptance Criteria

- Analysis returned within 30 seconds
- Missing fields handled gracefully

---

## FR-05 Job Analysis

### Description

System analyzes the target job posting.

### Output

- Required skills
- Preferred skills
- Responsibilities
- Recruiter priorities

### Acceptance Criteria

- Structured output returned
- Relevant keywords identified

---

## FR-06 Match Analysis

### Description

System compares resume and job posting.

### Output

- Match Score (0–100)
- Matching Skills
- Missing Skills
- Potential Concerns

### Acceptance Criteria

- Score generated successfully
- Supporting explanations provided

---

## FR-07 Cover Letter Generation

### Description

Generate a customized cover letter.

### Output Requirements

The generated cover letter must:

- Reference candidate experience
- Align with job requirements
- Avoid generic language
- Remain professional
- Stay below 400 words

### Acceptance Criteria

- Cover letter generated successfully
- User can edit content

---

## FR-08 Regenerate Cover Letter

### Description

Users can regenerate the cover letter.

### Acceptance Criteria

- New version generated
- Previous analysis reused

---

## FR-09 Copy Output

### Description

Users can copy generated content.

### Acceptance Criteria

- One-click copy available
- Success notification displayed

---

# User Flow

```text
Landing Page
    ↓
Upload Resume
    ↓
Paste Job Description OR Job URL
    ↓
Generate Analysis
    ↓
Analyze Resume
    ↓
Analyze Job
    ↓
Generate Match Score
    ↓
Generate Cover Letter
    ↓
Display Results
```

---

# Non-Functional Requirements

## Performance

- First page load < 3 seconds
- AI generation < 30 seconds

## Reliability

- Failed AI requests handled gracefully
- Failed scraping attempts display meaningful error messages

## Security

- No resume data permanently stored
- No user authentication required
- Uploaded files processed temporarily

## Accessibility

- Keyboard accessible
- Responsive on desktop and mobile

---

# Out of Scope

The following features are intentionally excluded:

- User accounts
- Resume builder
- Job application tracking
- Interview preparation
- ATS resume optimization
- Payment integration
- Resume storage/history
- Multi-language support

---

# Assumptions

- Users already have a resume
- Job descriptions contain sufficient detail
- Gemini can extract meaningful information from resume text
- Personalized cover letters improve application quality

---

# Success Metrics

## Primary Metric

Number of successfully generated cover letters.

## Secondary Metrics

- Generation completion rate
- Copy button usage rate
- Regeneration rate

---

# Technical Stack

## Frontend

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui

## AI

- Gemini 2.5 Pro

## Parsing

- pdf-parse
- mammoth

## Scraping

- Cheerio

## Deployment

- Vercel
