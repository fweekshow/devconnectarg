export interface GetFullScheduleParams {
  day?: string;
  searchAllDays?: boolean;
}

export interface GetSpecificDayScheduleParams {
  day: string;
}

export interface GetDayActivitiesParams {
  day: string;
  activity?: string;
}

export interface GetActivityTimeParams {
  activity: string;
  day?: string;
}

export interface GetNightActivitiesParams {
  day: string;
}
