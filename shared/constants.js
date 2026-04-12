// shared/constants.js

export const YEAR_LEVELS = [1, 2, 3, 4, 5];

export const MAX_SUBJECTS_PER_YEAR = 30;

export const PROCTOR_ROLES = {
    LOCAL: 'DEPARTMENT',
    GLOBAL: 'GLOBAL'
};

export const ROOM_PREFERENCES = {
    LOCAL: 'DEPARTMENT_PREFERRED',
    GLOBAL: 'GLOBAL_POOL'
};

// Standard exam duration as per your logic
export const SUBJECT_EXAM_DURATION_MINUTES = 60; 

// Helper to generate the Section Name (e.g., BSIS + 3 + C)
export const generateSectionName = (deptCode, yearLevel, index) => {
    const letter = String.fromCharCode(65 + index); // 0=A, 1=B, etc.
    return `${deptCode}${yearLevel}${letter}`;
};