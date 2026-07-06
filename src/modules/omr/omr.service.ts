import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OmrQuestionMaster } from '../../entities/omr-question-master.entity';
import { OmrStudentResponse } from '../../entities/omr-student-response.entity';

@Injectable()
export class OmrService {
  constructor(
    @InjectRepository(OmrQuestionMaster)
    private readonly questionRepo: Repository<OmrQuestionMaster>,
    @InjectRepository(OmrStudentResponse)
    private readonly responseRepo: Repository<OmrStudentResponse>,
  ) {}

  async getQuestionsByGradeAndSubject(grade: string, subject: string) {
    return this.questionRepo.find({
      where: { grade_id: Number(grade), subject_id: Number(subject), status: 1 },
      order: { item_number: 'ASC' }
    });
  }

  async saveStudentResponses(payload: {
    student_id: number;
    teacher_id: number;
    responses: { question_id: number; selected_option: string }[];
    status: number; // 0 for draft, 1 for submitted
  }, userId: string | number) {
    const { student_id, teacher_id, responses, status } = payload;

    // Fetch all relevant question metadata to determine correctness
    const questionIds = responses.map(r => r.question_id);
    if (questionIds.length === 0) return { message: 'No responses provided' };

    const questions = await this.questionRepo.findByIds(questionIds);
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Prepare entities for saving
    const responseEntities: OmrStudentResponse[] = responses.map(resp => {
      const question = questionMap.get(resp.question_id);
      if (!question) {
        throw new BadRequestException(`Question ID ${resp.question_id} not found`);
      }

      const is_correct = (resp.selected_option && resp.selected_option === question.correct_option) ? 1 : 0;

      const entity = this.responseRepo.create({
        student_id,
        teacher_id,
        question_id: resp.question_id,
        selected_option: resp.selected_option,
        is_correct,
        status,
        created_by: +userId,
        updated_by: +userId,
      });

      return entity;
    });

    // We can use save() which handles UPSERT if we supply the IDs, or we can clear existing and insert
    // Using an upsert or transaction is safer, but for now we'll delete existing for this student and insert new
    
    await this.responseRepo.delete({ student_id });
    const saved = await this.responseRepo.save(responseEntities);

    return {
      message: 'OMR responses saved successfully',
      count: saved.length
    };
  }
}
